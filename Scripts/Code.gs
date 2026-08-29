const CONFIG = {
  GITHUB_OWNER: 'WonbinAAA',
  GITHUB_REPO: 'Scripthub',
  GITHUB_BRANCH: 'main',
  SCRIPTS_FOLDER: 'Scripts'
};


/**
 * รับคำขอแบบ GET สำหรับดาวน์โหลดไฟล์
 */
function doGet(e) {
  try {
    const action = e && e.parameter ? e.parameter.action : '';

    if (action === 'downloadScript') {
      return jsonResponse(downloadScript(e.parameter.fileName || ''));
    }

    return jsonResponse({
      success: false,
      message: 'ไม่พบ action ที่ร้องขอ'
    });
  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message
    });
  }
}


/**
 * รับคำขอจากหน้าเว็บ
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    if (data.action === 'uploadScript') {
      return jsonResponse(uploadScript(data));
    }

    if (data.action === 'recoverAllScriptCards') {
      return jsonResponse(recoverAllScriptCards());
    }

    if (data.action === 'editScript') {
      return jsonResponse(editScript(data));
    }

    if (data.action === 'deleteScript') {
      return jsonResponse(deleteScript(data));
    }

    return jsonResponse({
      success: false,
      message: 'ไม่พบ action ที่ร้องขอ'
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.message
    });
  }
}


/**
 * ดาวน์โหลด Script ผ่าน Apps Script
 * ใช้ GitHub Contents API เพื่อดึงไฟล์ แล้วส่งกลับเป็น Base64 JSON
 * หน้าเว็บจะเปลี่ยน Base64 เป็น Blob และสั่งดาวน์โหลดเป็นไฟล์จริง
 */
function downloadScript(fileName) {
  const token = getGithubToken();
  fileName = sanitizeFileName(fileName || '');

  const path = CONFIG.SCRIPTS_FOLDER + '/' + fileName;
  const fileInfo = githubRequest(
    '/contents/' + encodePath(path) + '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (!fileInfo || !fileInfo.content) {
    throw new Error('ไม่พบไฟล์: ' + fileName);
  }

  return {
    success: true,
    fileName: fileName,
    contentBase64: String(fileInfo.content).replace(/\\s/g, ''),
    size: Number(fileInfo.size || 0)
  };
}


/**
 * Upload Script เข้า GitHub
 */
function uploadScript(data) {

  if (!data.fileName) {
    throw new Error('กรุณาระบุชื่อไฟล์');
  }

  if (!data.fileBase64) {
    throw new Error('ไม่พบไฟล์');
  }

  const token = PropertiesService
    .getScriptProperties()
    .getProperty('GITHUB_TOKEN');

  if (!token) {
    throw new Error('ยังไม่ได้ตั้งค่า GITHUB_TOKEN');
  }

  const fileName = sanitizeFileName(data.fileName);

  const path =
    CONFIG.SCRIPTS_FOLDER + '/' + fileName;

  const content = Utilities.base64Decode(
    data.fileBase64
  );

  const encodedContent =
    Utilities.base64Encode(content);

  /*
   * ตรวจสอบว่าไฟล์มีอยู่แล้วหรือไม่
   */
  const existing = githubRequest(
    '/contents/' + encodePath(path) +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (existing && existing.sha) {
    throw new Error(
      'มีไฟล์ชื่อ ' + fileName + ' อยู่ใน Scripts แล้ว'
    );
  }

  /*
   * Upload ไฟล์
   */
  const uploadResult = githubRequest(
    '/contents/' + encodePath(path),
    'PUT',
    token,
    {
      message: 'Upload script: ' + fileName,
      content: encodedContent,
      branch: CONFIG.GITHUB_BRANCH
    }
  );

  /*
   * เพิ่ม Card ใน index.html
   * หากไฟล์ถูก Upload สำเร็จแล้ว แต่ขั้นตอนสร้าง Card ล้มเหลว
   * ให้ Recovery ตรวจไฟล์บน GitHub แล้วพยายามสร้าง Card อีกครั้ง
   */
  try {
    updateIndexHtml(
      fileName,
      data.description || '',
      content.length,
      data.websiteUrl || '',
      token
    );
  } catch (cardError) {
    try {
      recoverScriptCard(fileName, data.description || '', content.length, token, data.websiteUrl || '');
    } catch (recoveryError) {
      throw new Error(
        'อัปโหลดไฟล์สำเร็จ แต่สร้าง Card ไม่สำเร็จ: ' +
        cardError.message +
        ' | Recovery: ' +
        recoveryError.message
      );
    }
  }

  return {
    success: true,
    message: 'Upload สำเร็จ',
    fileName: fileName,
    path: path,
    commit: uploadResult.commit
  };
}


/**
 * เพิ่ม Card เข้า index.html
 */
function updateIndexHtml(fileName, description, fileSizeBytes, websiteUrl, token) {

  const indexPath = 'index.html';

  const fileInfo = githubRequest(
    '/contents/' + indexPath +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  const htmlBytes =
    Utilities.base64Decode(fileInfo.content);

  let html = Utilities.newBlob(htmlBytes).getDataAsString('UTF-8');

  /*
   * ป้องกัน Card ซ้ำ โดยตรวจจากชื่อไฟล์ใน data-name / file-title
   */
  const escapedFileName = escapeHtml(fileName);
  if (
    html.indexOf('data-uploaded-script="' + escapedFileName + '"') !== -1 ||
    html.indexOf('<div class="file-title">' + escapedFileName + '</div>') !== -1
  ) {
    return;
  }

  /*
   * ค้นหา Marker ที่กำหนดไว้ใน index.html
   * ใช้ Regex เพื่อไม่ให้ช่องว่าง/รูปแบบ Comment ทำให้หา Marker ไม่เจอ
   */
  const markerRegex = /<!--\s*💡\s*วิธีเพิ่มสคริปต์ใหม่:[\s\S]*?-->/;
  const markerMatch = html.match(markerRegex);

  if (!markerMatch) {
    throw new Error(
      'ไม่พบ Marker สำหรับเพิ่ม Script Card ใน index.html'
    );
  }

  const marker = markerMatch[0];
  const position = html.indexOf(marker);

  const cardNumber = getNextCardNumber(html);
  const card = createScriptCard(
    fileName,
    description,
    cardNumber,
    fileSizeBytes,
    websiteUrl || ''
  );

  /*
   * วาง Card ก่อน Marker และเว้น 1 บรรทัดจาก Card เดิม
   */
  const beforeMarker = html.substring(0, position).replace(/\s*$/, '');
  const afterMarker = html.substring(position);
  html = beforeMarker + '\n\n' + card + '\n\n' + afterMarker;

  const newContent =
    Utilities.base64Encode(
      Utilities.newBlob(
        html,
        'text/html',
        'index.html'
      ).getBytes()
    );

  githubRequest(
    '/contents/' + indexPath,
    'PUT',
    token,
    {
      message: 'Add script card: ' + fileName,
      content: newContent,
      sha: fileInfo.sha,
      branch: CONFIG.GITHUB_BRANCH
    }
  );
}


/**
 * Recovery: ตรวจไฟล์ทั้งหมดใน /Scripts/ และสร้าง Card ที่ยังไม่มี
 * ใช้สำหรับกู้ไฟล์ที่ Upload สำเร็จ แต่ Card ไม่ถูกสร้าง
 */
/**
 * แก้ไขชื่อไฟล์และ/หรือคำอธิบายของ Script
 */
function editScript(data) {
  const token = getGithubToken();
  const oldFileName = sanitizeFileName(data.oldFileName || '');
  const newFileName = sanitizeFileName(data.newFileName || oldFileName);
  const description = String(data.description || '').trim();

  const oldPath = CONFIG.SCRIPTS_FOLDER + '/' + oldFileName;
  const newPath = CONFIG.SCRIPTS_FOLDER + '/' + newFileName;

  const oldFile = githubRequest(
    '/contents/' + encodePath(oldPath) + '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET', token
  );

  if (!oldFile || !oldFile.sha) {
    throw new Error('ไม่พบไฟล์เดิม: ' + oldFileName);
  }

  if (oldFileName.toLowerCase() !== newFileName.toLowerCase()) {
    const existingNew = githubRequest(
      '/contents/' + encodePath(newPath) + '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
      'GET', token
    );
    if (existingNew && existingNew.sha) {
      throw new Error('มีไฟล์ชื่อ ' + newFileName + ' อยู่ใน Scripts แล้ว');
    }
  }

  // เปลี่ยนชื่อไฟล์ด้วยการสร้างไฟล์ใหม่จากเนื้อหาเดิม แล้วลบไฟล์เก่า
  if (oldFileName !== newFileName) {
    githubRequest(
      '/contents/' + encodePath(newPath), 'PUT', token,
      {
        message: 'Rename script: ' + oldFileName + ' to ' + newFileName,
        content: oldFile.content,
        branch: CONFIG.GITHUB_BRANCH
      }
    );

    githubRequest(
      '/contents/' + encodePath(oldPath), 'DELETE', token,
      {
        message: 'Delete old script name: ' + oldFileName,
        sha: oldFile.sha,
        branch: CONFIG.GITHUB_BRANCH
      }
    );
  }

  updateExistingScriptCard(oldFileName, newFileName, description, oldFile.size || 0, token);

  return {
    success: true,
    oldFileName: oldFileName,
    fileName: newFileName,
    description: description,
    message: 'แก้ไข Script สำเร็จ'
  };
}


/**
 * ลบ Script และ Card ออกจาก GitHub
 */
function deleteScript(data) {
  const token = getGithubToken();
  const fileName = sanitizeFileName(data.fileName || '');
  const path = CONFIG.SCRIPTS_FOLDER + '/' + fileName;

  const fileInfo = githubRequest(
    '/contents/' + encodePath(path) + '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET', token
  );

  if (!fileInfo || !fileInfo.sha) {
    throw new Error('ไม่พบไฟล์: ' + fileName);
  }

  // แก้ index.html ก่อน เพื่อให้ถ้าการแก้ Card ไม่สำเร็จ
  // ไฟล์ Script จะยังไม่ถูกลบ และระบบจะไม่ตอบว่า "ลบสำเร็จ"
  removeScriptCard(fileName, token);

  // เมื่อแก้ index.html สำเร็จแล้ว จึงลบไฟล์จริงจาก /Scripts/
  githubRequest(
    '/contents/' + encodePath(path), 'DELETE', token,
    {
      message: 'Delete script: ' + fileName,
      sha: fileInfo.sha,
      branch: CONFIG.GITHUB_BRANCH
    }
  );

  return {
    success: true,
    fileName: fileName,
    message: 'ลบ Script สำเร็จ'
  };
}


function getGithubToken() {
  const token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('ยังไม่ได้ตั้งค่า GITHUB_TOKEN');
  return token;
}


/** แก้ Card เดิมใน index.html */
function updateExistingScriptCard(oldFileName, newFileName, description, fileSizeBytes, token) {
  const indexInfo = getIndexHtml(token);
  let html = indexInfo.html;
  const oldEscaped = escapeHtml(oldFileName);
  const newEscaped = escapeHtml(newFileName);
  const oldCardRegex = new RegExp(
    '<div class="card"[^>]*data-uploaded-script="' + escapeRegExp(oldEscaped) + '"[^>]*>[\\s\\S]*?<\\/div>\\s*<\\/div>',
    'i'
  );
  const titleRegex = new RegExp(
    '<div class="file-title">' + escapeRegExp(oldEscaped) + '<\\/div>', 'i'
  );

  const cardMatch = html.match(oldCardRegex);
  if (!cardMatch) {
    // Card เก่าอาจไม่มี data-uploaded-script ให้ค้นจาก file-title แล้วหา parent card
    const titleMatch = html.match(titleRegex);
    if (!titleMatch) throw new Error('ไม่พบ Card ของ ' + oldFileName + ' ใน index.html');

    const titlePos = titleMatch.index;
    const cardStart = html.lastIndexOf('<div class="card"', titlePos);
    const cardEnd = html.indexOf('</div>\n\n<!--', titlePos);
    if (cardStart < 0 || cardEnd < 0) throw new Error('ไม่สามารถระบุขอบเขต Card ของ ' + oldFileName);
    return rewriteCardAtPosition(html, indexInfo.sha, cardStart, cardEnd + 6, oldFileName, newFileName, description, fileSizeBytes, token);
  }

  const cardStart = cardMatch.index;
  const cardEnd = cardStart + cardMatch[0].length;
  return rewriteCardAtPosition(html, indexInfo.sha, cardStart, cardEnd, oldFileName, newFileName, description, fileSizeBytes, token);
}

function rewriteCardAtPosition(html, sha, cardStart, cardEnd, oldFileName, newFileName, description, fileSizeBytes, token) {
  const original = html.substring(cardStart, cardEnd);
  const extension = getFileExtension(newFileName);
  const sizeText = formatFileSize(fileSizeBytes);
  const safeOld = escapeRegExp(escapeHtml(oldFileName));
  const safeNew = escapeHtml(newFileName);
  const safeDescription = escapeHtml(description || 'ไม่มีคำอธิบาย');
  let updated = original;

  updated = updated.replace(/data-uploaded-script="[^"]*"/i, 'data-uploaded-script="' + safeNew + '"');
  updated = updated.replace(/data-name="[^"]*"/i, 'data-name="' + safeNew.toLowerCase() + ' ' + safeDescription.toLowerCase() + '"');
  updated = updated.replace(/(<div class="file-title">)[\s\S]*?(<\/div>)/i, '$1' + safeNew + '$2');
  updated = updated.replace(/(<div class="file-desc">)[\s\S]*?(<\/div>)/i, '$1' + safeDescription + '$2');
  updated = updated.replace(/(<span class="file-meta">)[\s\S]*?(<\/span>)/i, '$1' + extension + ' • ' + sizeText + '$2');
  updated = updated.replace(/https:\/\/github\.com\/[^\s"']+\/Scripts\/[^\s"']+/i,
    'https://github.com/' + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO + '/raw/refs/heads/' + CONFIG.GITHUB_BRANCH + '/' + CONFIG.SCRIPTS_FOLDER + '/' + encodeURIComponent(newFileName));

  const newHtml = html.substring(0, cardStart) + updated + html.substring(cardEnd);
  putIndexHtml(newHtml, sha, 'Update script card: ' + newFileName, token);
}


/** ลบ Card จาก index.html */
function removeScriptCard(fileName, token) {
  const indexInfo = getIndexHtml(token);
  const html = indexInfo.html;
  const escaped = escapeRegExp(escapeHtml(fileName));
  /*
   * สำคัญ: Card มี div ซ้อนกันหลายชั้น
   * ห้ามใช้ [\\s\\S]*?<\\/div>\\s* แบบเดิม เพราะ Regex จะหยุดที่
   * </div> ตัวแรกที่ตรงเงื่อนไข ทำให้เหลือโค้ดบางส่วนของ Card ไว้
   * เช่น .file-desc / .file-meta / .card-actions
   *
   * วิธีนี้จะลบตั้งแต่ Comment "<!-- การ์ดที่ X -->"
   * จนถึงก่อน Comment ของ Card ถัดไป หรือ Marker วิธีเพิ่ม Script
   */
  const cardRegex = new RegExp(
    '\\s*<!--\\s*การ์ดที่\\s*\\d+\\s*-->\\s*<div class="card"[^>]*data-uploaded-script="' +
    escaped +
    '"[^>]*>[\\s\\S]*?(?=<!--\\s*การ์ดที่\\s*\\d+\\s*-->|<!--\\s*💡\\s*วิธีเพิ่มสคริปต์ใหม่:)',
    'i'
  );
  let newHtml = html.replace(cardRegex, '\n\n');

  if (newHtml === html) {
    /* Fallback สำหรับ Card เก่าที่ไม่มี data-uploaded-script */
    const titleRegex = new RegExp(
      '\\s*<!--\\s*การ์ดที่\\s*\\d+\\s*-->\\s*<div class="card"[^>]*>[\\s\\S]*?<div class="file-title">' +
      escaped +
      '<\\/div>[\\s\\S]*?(?=<!--\\s*การ์ดที่\\s*\\d+\\s*-->|<!--\\s*💡\\s*วิธีเพิ่มสคริปต์ใหม่:)',
      'i'
    );
    newHtml = html.replace(titleRegex, '\n\n');
  }

  if (newHtml === html) {
    throw new Error('ไม่พบ Card ของ ' + fileName + ' ใน index.html');
  }

  // Commit index.html ก่อน แล้วตรวจสอบจาก GitHub API อีกครั้งว่า Card หายจริง
  putIndexHtml(newHtml, indexInfo.sha, 'Delete script card: ' + fileName, token);

  const verifyInfo = getIndexHtml(token);
  const verifyHtml = verifyInfo.html;
  const stillHasCard =
    verifyHtml.indexOf('data-uploaded-script="' + escapeHtml(fileName) + '"') !== -1 ||
    verifyHtml.indexOf('<div class="file-title">' + escapeHtml(fileName) + '</div>') !== -1;

  if (stillHasCard) {
    throw new Error('GitHub ยังไม่ยืนยันว่า Card ของ ' + fileName + ' ถูกลบออกจาก index.html');
  }

  console.log('ยืนยันแล้ว: Card ของ ' + fileName + ' ถูกลบจาก index.html บน GitHub สำเร็จ');
}

function putIndexHtml(html, sha, message, token) {
  const content = Utilities.base64Encode(Utilities.newBlob(html, 'text/html', 'index.html').getBytes());
  return githubRequest('/contents/index.html', 'PUT', token, {
    message: message,
    content: content,
    sha: sha,
    branch: CONFIG.GITHUB_BRANCH
  });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


function recoverAllScriptCards() {

  const token = PropertiesService
    .getScriptProperties()
    .getProperty('GITHUB_TOKEN');

  if (!token) {
    throw new Error('ยังไม่ได้ตั้งค่า GITHUB_TOKEN');
  }

  const files = githubRequest(
    '/contents/' + CONFIG.SCRIPTS_FOLDER +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (!Array.isArray(files)) {
    throw new Error('ไม่สามารถอ่านโฟลเดอร์ /' + CONFIG.SCRIPTS_FOLDER + '/ ได้');
  }

  console.log('พบรายการใน /' + CONFIG.SCRIPTS_FOLDER + '/ ทั้งหมด: ' + files.length + ' รายการ');

  let recovered = 0;
  let skipped = 0;
  let ignored = 0;
  const errors = [];

  files.forEach(function(file) {

    if (file.type !== 'file') {
      ignored++;
      console.log('ข้ามรายการที่ไม่ใช่ไฟล์: ' + file.name);
      return;
    }

    /* .gitkeep เป็นไฟล์ระบบ ไม่ใช่ Script และไม่ต้องสร้าง Card */
    if (file.name.toLowerCase() === '.gitkeep') {
      ignored++;
      console.log('ไม่สนใจไฟล์ระบบ: ' + file.name);
      return;
    }

    try {
      const indexInfo = getIndexHtml(token);
      const escapedFileName = escapeHtml(file.name);

      const alreadyExists =
        indexInfo.html.indexOf('data-uploaded-script="' + escapedFileName + '"') !== -1 ||
        indexInfo.html.indexOf('<div class="file-title">' + escapedFileName + '</div>') !== -1;

      if (alreadyExists) {
        skipped++;
        console.log('มี Card แล้ว → ข้าม: ' + file.name);
        return;
      }

      console.log('กำลัง Recovery: ' + file.name);

      recoverScriptCard(
        file.name,
        'Script ที่อยู่ใน GitHub',
        file.size || 0,
        token
      );

      recovered++;
      console.log('สร้าง Card สำเร็จ: ' + file.name);

    } catch (error) {
      errors.push(file.name + ': ' + error.message);
      console.error('Recovery ไม่สำเร็จ: ' + file.name + ' → ' + error.message);
    }
  });

  const result = {
    success: errors.length === 0,
    recovered: recovered,
    skipped: skipped,
    ignored: ignored,
    errors: errors,
    message: 'Recovery เสร็จแล้ว: เพิ่ม ' + recovered + ' Card, ข้าม ' + skipped + ' Card, ไม่สนใจ ' + ignored + ' ไฟล์'
  };

  console.log(JSON.stringify(result, null, 2));
  return result;
}


/**
 * อ่าน index.html และคืนค่า SHA + HTML ล่าสุด
 */
function getIndexHtml(token) {

  const fileInfo = githubRequest(
    '/contents/index.html' +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (!fileInfo || !fileInfo.content) {
    throw new Error('ไม่สามารถอ่าน index.html จาก GitHub ได้');
  }

  const htmlBytes = Utilities.base64Decode(fileInfo.content);

  return {
    sha: fileInfo.sha,
    html: Utilities.newBlob(htmlBytes).getDataAsString('UTF-8')
  };
}


/**
 * สร้าง Card
 */
function recoverScriptCard(fileName, description, fileSizeBytes, token, websiteUrl) {

  const indexPath = 'index.html';

  const fileInfo = githubRequest(
    '/contents/' + indexPath +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (!fileInfo || !fileInfo.content) {
    throw new Error('ไม่สามารถอ่าน index.html จาก GitHub ได้');
  }

  const htmlBytes = Utilities.base64Decode(fileInfo.content);
  let html = Utilities.newBlob(htmlBytes).getDataAsString('UTF-8');
  const escapedFileName = escapeHtml(fileName);

  /* ป้องกัน Card ซ้ำ */
  if (
    html.indexOf('data-uploaded-script="' + escapedFileName + '"') !== -1 ||
    html.indexOf('<div class="file-title">' + escapedFileName + '</div>') !== -1
  ) {
    return {
      success: true,
      alreadyExists: true
    };
  }

  /* ตรวจว่าไฟล์มีอยู่จริงบน GitHub ก่อน Recovery */
  const scriptPath = CONFIG.SCRIPTS_FOLDER + '/' + fileName;
  const scriptInfo = githubRequest(
    '/contents/' + encodePath(scriptPath) +
    '?ref=' + encodeURIComponent(CONFIG.GITHUB_BRANCH),
    'GET',
    token
  );

  if (!scriptInfo || !scriptInfo.sha) {
    throw new Error('ไม่พบไฟล์ ' + fileName + ' ใน /' + CONFIG.SCRIPTS_FOLDER + '/');
  }

  /* ใช้ขนาดจริงจาก GitHub หากไม่ได้รับขนาดมา */
  if (!fileSizeBytes && scriptInfo.size) {
    fileSizeBytes = scriptInfo.size;
  }

  /*
   * ค้นหา Marker ตามข้อความหลัก เพื่อไม่ให้ปัญหา encoding ของ Emoji
   * ทำให้ Recovery หาตำแหน่งไม่เจอ
   */
  const markerRegex = /<!--\s*💡\s*วิธีเพิ่มสคริปต์ใหม่:[\s\S]*?-->/;
  const markerMatch = html.match(markerRegex);

  if (!markerMatch) {
    throw new Error('ไม่พบ Marker สำหรับเพิ่ม Script Card ใน index.html');
  }

  const marker = markerMatch[0];
  const position = html.indexOf(marker);

  const cardNumber = getNextCardNumber(html);
  const card = createScriptCard(
    fileName,
    description,
    cardNumber,
    fileSizeBytes || scriptInfo.size || 0,
    websiteUrl || ''
  );

  const beforeMarker = html.substring(0, position).replace(/\s*$/, '');
  const afterMarker = html.substring(position);
  html = beforeMarker + '\n\n' + card + '\n\n' + afterMarker;

  const newContent = Utilities.base64Encode(
    Utilities.newBlob(html, 'text/html', 'index.html').getBytes()
  );

  githubRequest(
    '/contents/' + indexPath,
    'PUT',
    token,
    {
      message: 'Recovery add script card: ' + fileName,
      content: newContent,
      sha: fileInfo.sha,
      branch: CONFIG.GITHUB_BRANCH
    }
  );

  return {
    success: true,
    alreadyExists: false,
    cardNumber: cardNumber
  };
}


/**
 * สร้าง Card
 */
function createScriptCard(fileName, description, cardNumber, fileSizeBytes, websiteUrl) {

  const safeFileName = escapeHtml(fileName);
  const safeDescription = escapeHtml(
    description || 'ไม่มีคำอธิบาย'
  );

  const extension = getFileExtension(fileName);
  const fileSize = formatFileSize(fileSizeBytes);

  const safeWebsiteUrl = String(websiteUrl || '').trim();
  const websiteButton = safeWebsiteUrl
    ? `\n        <a href="${escapeHtml(safeWebsiteUrl)}" class="btn-website" target="_blank" rel="noopener">🌐 เปิดเว็บไซต์</a>`
    : '';

  const downloadUrl =
    'https://github.com/' +
    CONFIG.GITHUB_OWNER +
    '/' +
    CONFIG.GITHUB_REPO +
    '/raw/refs/heads/' +
    CONFIG.GITHUB_BRANCH +
    '/' +
    CONFIG.SCRIPTS_FOLDER +
    '/' +
    encodeURIComponent(fileName);

  return `<!-- การ์ดที่ ${cardNumber} -->
<div class="card" id="script-${cardNumber}" data-uploaded-script="${safeFileName}" data-website-url="${escapeHtml(String(websiteUrl || '').trim())}" data-name="${safeFileName.toLowerCase()} ${safeDescription.toLowerCase()}">
    <div>
        <div class="file-title">${safeFileName}</div>
        <div class="file-desc">${safeDescription}</div>
        <span class="file-meta">${extension} • ${fileSize}</span>
    </div>
    <div class="card-actions">
        <a href="${downloadUrl}"
            class="btn-download">ดาวน์โหลด</a>${websiteButton}
        <button class="card-icon-btn edit" type="button" title="แก้ไข" aria-label="แก้ไข" data-action="edit">✎</button>
        <button class="card-icon-btn delete" type="button" title="ลบ" aria-label="ลบ" data-action="delete">🗑</button>
    </div>
</div>`;
}


/**
 * หาเลข Card ถัดไปจาก Card ที่มีอยู่ใน index.html
 */
function getNextCardNumber(html) {
  const matches = html.match(/<!--\s*การ์ดที่\s*(\d+)\s*-->/g) || [];
  let maxNumber = 0;

  matches.forEach(function (match) {
    const result = match.match(/(\d+)/);
    if (result) maxNumber = Math.max(maxNumber, Number(result[1]));
  });

  return maxNumber + 1;
}

/**
 * นามสกุลไฟล์สำหรับแสดงบน Card
 */
function getFileExtension(fileName) {
  const index = fileName.lastIndexOf('.');
  if (index === -1) return 'FILE';
  return fileName.substring(index).toUpperCase();
}

/**
 * แปลงขนาดไฟล์เป็น KB / MB
 */
function formatFileSize(bytes) {
  bytes = Number(bytes) || 0;

  if (bytes < 1024) return bytes + ' B';

  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(2) + ' KB';

  return (kb / 1024).toFixed(2) + ' MB';
}

/**
 * GitHub API
 */
function githubRequest(path, method, token, payload) {

  const url =
    'https://api.github.com/repos/' +
    CONFIG.GITHUB_OWNER +
    '/' +
    CONFIG.GITHUB_REPO +
    path;

  const options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }

  const response =
    UrlFetchApp.fetch(url, options);

  const code =
    response.getResponseCode();

  const text =
    response.getContentText();

  if (code < 200 || code >= 300) {

    /*
     * GET ไฟล์ที่ยังไม่มีจะเป็น 404
     * ให้ส่ง null กลับเพื่อให้ Upload ต่อได้
     */
    if (method === 'GET' && code === 404) {
      return null;
    }

    let message = text;

    try {
      const error = JSON.parse(text);
      message = error.message || text;
    } catch (_) {}

    throw new Error(
      'GitHub API Error (' +
      code +
      '): ' +
      message
    );
  }

  return JSON.parse(text);
}


/**
 * เก็บ Token
 */
function setGithubToken() {

  /*
   * ใส่ Token เฉพาะตอนรันฟังก์ชันนี้
   * ไม่ต้องใส่ Token ลงใน index.html
   */
  const token = 'ใส่_TOKEN_ของคุณตรงนี้';

  PropertiesService
    .getScriptProperties()
    .setProperty(
      'GITHUB_TOKEN',
      token
    );
}


/**
 * ทดสอบว่า Token ใช้งานได้
 */
function testGithubToken() {

  const token =
    PropertiesService
      .getScriptProperties()
      .getProperty('GITHUB_TOKEN');

  if (!token) {
    throw new Error(
      'ยังไม่ได้ตั้งค่า GITHUB_TOKEN'
    );
  }

  const result = githubRequest(
    '',
    'GET',
    token
  );

  Logger.log(result);
}


/**
 * ป้องกันชื่อไฟล์ผิดรูปแบบ
 */
function sanitizeFileName(name) {

  name = String(name).trim();

  if (!name) {
    throw new Error('ชื่อไฟล์ว่าง');
  }

  if (
    name.includes('/') ||
    name.includes('\\') ||
    name.includes('..')
  ) {
    throw new Error(
      'ชื่อไฟล์ไม่ถูกต้อง'
    );
  }

  return name;
}


/**
 * Encode path
 */
function encodePath(path) {

  return path
    .split('/')
    .map(encodeURIComponent)
    .join('/');
}


/**
 * Escape HTML
 */
function escapeHtml(value) {

  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


/**
 * JSON Response
 */
function jsonResponse(data) {

  return ContentService
    .createTextOutput(
      JSON.stringify(data)
    )
    .setMimeType(
      ContentService.MimeType.JSON
    );
}