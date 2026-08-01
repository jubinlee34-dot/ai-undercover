/**
 * AI UNDERCOVER
 * Google Sheets database foundation
 */

const APP_VERSION = '0.1.0';

const SHEET_SCHEMAS = Object.freeze({
  SETTINGS: [
    'setting_key',
    'category',
    'display_name',
    'value',
    'value_type',
    'min_value',
    'max_value',
    'editable',
    'description',
    'updated_at',
  ],

  OPTIONS: [
    'option_group',
    'option_key',
    'display_label',
    'sort_order',
    'enabled',
    'color',
    'is_system',
    'description',
    'updated_at',
  ],

  SESSIONS: [
    'session_id',
    'join_code',
    'title',
    'status',
    'current_phase',
    'current_round',
    'max_teams',
    'timer_end_at',
    'announcement',
    'admin_token_hash',
    'config_version',
    'config_snapshot',
    'created_at',
    'updated_at',
  ],

  TEAMS: [
    'team_id',
    'session_id',
    'team_no',
    'team_name',
    'representative_name',
    'status',
    'team_token_hash',
    'joined_at',
    'last_seen_at',
    'updated_at',
  ],

  PROBLEMS: [
    'problem_id',
    'session_id',
    'creator_team_id',
    'title',
    'card_a_title',
    'card_a_body',
    'card_a_source',
    'card_b_title',
    'card_b_body',
    'card_b_source',
    'card_c_title',
    'card_c_body',
    'card_c_source',
    'correct_choice',
    'hallucination_explanation',
    'review_status',
    'revision_note',
    'submitted_at',
    'reviewed_at',
    'approved_at',
    'version',
    'updated_at',
  ],

  ASSIGNMENTS: [
    'assignment_id',
    'session_id',
    'round',
    'solver_team_id',
    'problem_id',
    'creator_team_id',
    'status',
    'assigned_at',
    'opened_at',
    'submitted_at',
  ],

  ANSWERS: [
    'answer_id',
    'assignment_id',
    'session_id',
    'round',
    'solver_team_id',
    'problem_id',
    'selected_choice',
    'reasoning',
    'verification_source',
    'confidence',
    'submitted_at',
    'is_correct',
    'correct_score',
    'reasoning_score',
    'source_score',
    'instructor_score',
    'total_score',
    'graded_at',
  ],

  SCORES: [
    'score_id',
    'session_id',
    'team_id',
    'team_name',
    'round1_score',
    'round2_score',
    'creator_defense_score',
    'total_score',
    'rank',
    'updated_at',
  ],
});

const OPTION_VALIDATIONS = Object.freeze([
  {
    sheetName: 'SESSIONS',
    header: 'status',
    optionGroup: 'session_status',
  },
  {
    sheetName: 'SESSIONS',
    header: 'current_phase',
    optionGroup: 'current_phase',
  },
  {
    sheetName: 'TEAMS',
    header: 'status',
    optionGroup: 'team_status',
  },
  {
    sheetName: 'PROBLEMS',
    header: 'correct_choice',
    optionGroup: 'choice',
  },
  {
    sheetName: 'PROBLEMS',
    header: 'review_status',
    optionGroup: 'review_status',
  },
  {
    sheetName: 'ASSIGNMENTS',
    header: 'status',
    optionGroup: 'assignment_status',
  },
  {
    sheetName: 'ANSWERS',
    header: 'selected_choice',
    optionGroup: 'choice',
  },
]);

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('AI 언더커버')
    .addItem('DB 초기 설정', 'setupProject')
    .addItem('DB 구조 검사', 'validateDatabase')
    .addItem('드롭다운 새로고침', 'applyDataValidations')
    .addToUi();
}

/**
 * 처음 한 번 실행하는 초기 설정 함수
 */
function setupProject() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('현재 스프레드시트를 찾을 수 없습니다.');
  }

  const properties = PropertiesService.getScriptProperties();

  properties.setProperty('SPREADSHEET_ID', spreadsheet.getId());

  if (!properties.getProperty('API_SECRET')) {
    properties.setProperty('API_SECRET', createSecret_());
  }

  const validationResult = validateDatabase_();

  if (!validationResult.ok) {
    throw new Error(
      'DB 구조 오류가 있습니다.\n\n' +
      validationResult.errors.join('\n')
    );
  }

  formatSheets_();
  applyDataValidations_();

  const result = {
    ok: true,
    message: 'AI UNDERCOVER DB 초기 설정 완료',
    spreadsheetId: spreadsheet.getId(),
    sheetCount: Object.keys(SHEET_SCHEMAS).length,
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(result, null, 2));

  SpreadsheetApp.getUi().alert(
    '초기 설정 완료',
    '8개 시트 구조 검사와 드롭다운 설정이 완료되었습니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return result;
}

/**
 * 메뉴에서 실행하는 DB 검사
 */
function validateDatabase() {
  const result = validateDatabase_();

  console.log(JSON.stringify(result, null, 2));

  SpreadsheetApp.getUi().alert(
    result.ok ? 'DB 구조 정상' : 'DB 구조 오류',
    result.ok
      ? '8개 시트의 이름과 머리글이 모두 정상입니다.'
      : result.errors.join('\n'),
    SpreadsheetApp.getUi().ButtonSet.OK
  );

  return result;
}

/**
 * 메뉴에서 실행하는 드롭다운 갱신
 */
function applyDataValidations() {
  const result = validateDatabase_();

  if (!result.ok) {
    throw new Error(result.errors.join('\n'));
  }

  applyDataValidations_();

  SpreadsheetApp.getUi().alert(
    '드롭다운 설정 완료',
    'OPTIONS 값을 기준으로 데이터 유효성 검사가 적용되었습니다.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}

/**
 * 외부 상태 확인용 공개 엔드포인트
 *
 * 예:
 * /exec?action=health
 */
function doGet(e) {
  try {
    const action =
      e && e.parameter && e.parameter.action
        ? String(e.parameter.action)
        : 'health';

    if (action !== 'health') {
      return jsonResponse_({
        ok: false,
        error: '지원하지 않는 GET 요청입니다.',
      });
    }

    return jsonResponse_({
      ok: true,
      service: 'AI_UNDERCOVER_API',
      version: APP_VERSION,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return errorResponse_(error);
  }
}

/**
 * Vercel API에서 호출할 POST 엔드포인트 기본 골격
 *
 * 요청 예:
 * {
 *   "action": "schema",
 *   "apiSecret": "..."
 * }
 */
function doPost(e) {
  try {
    const body = parseRequestBody_(e);

    verifyApiSecret_(body.apiSecret);

    switch (body.action) {
      case 'schema':
        return jsonResponse_(validateDatabase_());

      case 'config':
        return jsonResponse_({
          ok: true,
          data: getConfig_(),
        });

      case 'session.create':
        return jsonResponse_({
          ok: true,
          data: createSession_(body.data),
        });

      case 'session.getPublic':
        return getPublicSessionResponse_(body.data);

      default:
        return jsonResponse_({
          ok: false,
          error: '지원하지 않는 POST action입니다.',
        });
    }
  } catch (error) {
    return errorResponse_(error);
  }
}

/**
 * 참여 코드 기반 공개 수업방 조회
 */
function getPublicSessionResponse_(data) {
  const joinCode =
    data && typeof data.joinCode === 'string'
      ? data.joinCode.trim().toUpperCase()
      : '';

  if (!/^[A-F0-9]{6}$/.test(joinCode)) {
    throw new Error('Invalid join code.');
  }

  const session = readRowsAsObjects_('SESSIONS').find(function (row) {
    return (
      String(row.join_code || '').trim().toUpperCase() === joinCode
    );
  });

  if (!session) {
    return jsonResponse_({
      ok: false,
      error: 'SESSION_NOT_FOUND',
    });
  }

  return jsonResponse_({
    ok: true,
    data: {
      sessionId: String(session.session_id),
      joinCode: String(session.join_code).trim().toUpperCase(),
      title: String(session.title),
      status: String(session.status),
      currentPhase: String(session.current_phase),
      currentRound: Number(session.current_round),
      maxTeams: Number(session.max_teams),
    },
  });
}

/**
 * 새 수업방 생성
 */
function createSession_(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid session create request.');
  }

  const title =
    typeof data.title === 'string'
      ? data.title.trim()
      : '';
  const maxTeams = data.maxTeams;

  if (!title) {
    throw new Error('Session title is required.');
  }

  if (
    typeof maxTeams !== 'number' ||
    !Number.isInteger(maxTeams) ||
    maxTeams < 3 ||
    maxTeams > 7
  ) {
    throw new Error('maxTeams must be an integer from 3 to 7.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(5000);

  try {
    return createSessionWithLock_(title, maxTeams);
  } finally {
    lock.releaseLock();
  }
}

function createSessionWithLock_(title, maxTeams) {
  const sheet = getSpreadsheet_().getSheetByName('SESSIONS');

  if (!sheet) {
    throw new Error('SESSIONS sheet was not found.');
  }

  const config = getConfig_();
  const now = new Date().toISOString();
  const session = {
    session_id: Utilities.getUuid(),
    join_code: createUniqueJoinCode_(),
    title: title,
    status: 'active',
    current_phase: 'lobby',
    current_round: 0,
    max_teams: maxTeams,
    timer_end_at: '',
    announcement: '',
    admin_token_hash: '',
    config_version: config.version,
    config_snapshot: JSON.stringify(config),
    created_at: now,
    updated_at: now,
  };

  const lastColumn = sheet.getLastColumn();

  if (lastColumn === 0) {
    throw new Error('SESSIONS headers were not found.');
  }

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0]
    .map(function (header) {
      return String(header).trim();
    });

  SHEET_SCHEMAS.SESSIONS.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      throw new Error('SESSIONS header was not found: ' + header);
    }
  });

  sheet.appendRow(
    headers.map(function (header) {
      const value = Object.prototype.hasOwnProperty.call(
        session,
        header
      )
        ? session[header]
        : '';

      if (
        typeof value === 'string' &&
        /^[=+\-@]/.test(value)
      ) {
        return "'" + value;
      }

      return value;
    })
  );

  return {
    sessionId: session.session_id,
    joinCode: session.join_code,
    title: session.title,
    status: session.status,
    currentPhase: session.current_phase,
    currentRound: session.current_round,
    maxTeams: session.max_teams,
    createdAt: session.created_at,
  };
}

function createUniqueJoinCode_() {
  const existingCodes = {};

  readRowsAsObjects_('SESSIONS').forEach(function (row) {
    const code = String(row.join_code || '').trim().toUpperCase();

    if (code) {
      existingCodes[code] = true;
    }
  });

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = Utilities
      .getUuid()
      .replace(/-/g, '')
      .slice(0, 6)
      .toUpperCase();

    if (!existingCodes[candidate]) {
      return candidate;
    }
  }

  throw new Error('Could not generate a unique join code.');
}

/**
 * 전체 시트와 머리글 검사
 */
function validateDatabase_() {
  const spreadsheet = getSpreadsheet_();
  const errors = [];

  Object.keys(SHEET_SCHEMAS).forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const expectedHeaders = SHEET_SCHEMAS[sheetName];

    if (!sheet) {
      errors.push('시트 없음: ' + sheetName);
      return;
    }

    const actualHeaders = sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .getDisplayValues()[0]
      .map(function (value) {
        return String(value).trim();
      });

    expectedHeaders.forEach(function (expectedHeader, index) {
      const actualHeader = actualHeaders[index];

      if (actualHeader !== expectedHeader) {
        errors.push(
          sheetName +
          '!' +
          columnToLetter_(index + 1) +
          '1: "' +
          expectedHeader +
          '"가 필요하지만 "' +
          actualHeader +
          '"가 입력되어 있습니다.'
        );
      }
    });

    if (sheet.getLastColumn() > expectedHeaders.length) {
      const extraHeaders = sheet
        .getRange(
          1,
          expectedHeaders.length + 1,
          1,
          sheet.getLastColumn() - expectedHeaders.length
        )
        .getDisplayValues()[0]
        .filter(function (value) {
          return String(value).trim() !== '';
        });

      if (extraHeaders.length > 0) {
        errors.push(sheetName + ': 정의되지 않은 추가 머리글이 있습니다.');
      }
    }
  });

  validateSettings_(errors);
  validateOptions_(errors);

  return {
    ok: errors.length === 0,
    errors: errors,
    checkedSheets: Object.keys(SHEET_SCHEMAS),
    timestamp: new Date().toISOString(),
  };
}

/**
 * SETTINGS 값 검사
 */
function validateSettings_(errors) {
  const rows = readRowsAsObjects_('SETTINGS');
  const keys = {};
  const allowedTypes = ['text', 'number', 'boolean'];

  rows.forEach(function (row, index) {
    const rowNumber = index + 2;
    const key = String(row.setting_key || '').trim();
    const type = String(row.value_type || '').trim();

    if (!key) {
      return;
    }

    if (keys[key]) {
      errors.push(
        'SETTINGS ' + rowNumber + '행: setting_key가 중복되었습니다. ' + key
      );
    }

    keys[key] = true;

    if (allowedTypes.indexOf(type) === -1) {
      errors.push(
        'SETTINGS ' + rowNumber +
        '행: value_type은 text, number, boolean 중 하나여야 합니다.'
      );
      return;
    }

    if (type === 'number') {
      const value = Number(row.value);
      const minValue =
        row.min_value === '' ? null : Number(row.min_value);
      const maxValue =
        row.max_value === '' ? null : Number(row.max_value);

      if (!Number.isFinite(value)) {
        errors.push(
          'SETTINGS ' + rowNumber + '행: value가 숫자가 아닙니다.'
        );
      }

      if (minValue !== null && value < minValue) {
        errors.push(
          'SETTINGS ' + rowNumber + '행: 최소값보다 작습니다.'
        );
      }

      if (maxValue !== null && value > maxValue) {
        errors.push(
          'SETTINGS ' + rowNumber + '행: 최대값보다 큽니다.'
        );
      }
    }

    if (
      type === 'boolean' &&
      normalizeBoolean_(row.value) === null
    ) {
      errors.push(
        'SETTINGS ' + rowNumber +
        '행: boolean 값은 TRUE 또는 FALSE여야 합니다.'
      );
    }
  });
}

/**
 * OPTIONS 값 검사
 */
function validateOptions_(errors) {
  const rows = readRowsAsObjects_('OPTIONS');
  const keys = {};
  const groups = {};

  rows.forEach(function (row, index) {
    const rowNumber = index + 2;
    const group = String(row.option_group || '').trim();
    const key = String(row.option_key || '').trim();

    if (!group && !key) {
      return;
    }

    if (!group || !key) {
      errors.push(
        'OPTIONS ' + rowNumber +
        '행: option_group과 option_key가 모두 필요합니다.'
      );
      return;
    }

    const compositeKey = group + ':' + key;

    if (keys[compositeKey]) {
      errors.push(
        'OPTIONS ' + rowNumber +
        '행: option 값이 중복되었습니다. ' +
        compositeKey
      );
    }

    keys[compositeKey] = true;
    groups[group] = true;

    if (!Number.isFinite(Number(row.sort_order))) {
      errors.push(
        'OPTIONS ' + rowNumber + '행: sort_order는 숫자여야 합니다.'
      );
    }

    if (normalizeBoolean_(row.enabled) === null) {
      errors.push(
        'OPTIONS ' + rowNumber +
        '행: enabled는 TRUE 또는 FALSE여야 합니다.'
      );
    }

    const color = String(row.color || '').trim();

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      errors.push(
        'OPTIONS ' + rowNumber +
        '행: color는 #RRGGBB 형식이어야 합니다.'
      );
    }
  });

  [
    'session_status',
    'current_phase',
    'team_status',
    'review_status',
    'assignment_status',
    'choice',
  ].forEach(function (requiredGroup) {
    if (!groups[requiredGroup]) {
      errors.push(
        'OPTIONS에 필수 option_group이 없습니다: ' + requiredGroup
      );
    }
  });
}

/**
 * OPTIONS 기반 데이터 유효성 검사
 */
function applyDataValidations_() {
  OPTION_VALIDATIONS.forEach(function (item) {
    const values = getOptionKeys_(item.optionGroup);

    if (values.length === 0) {
      throw new Error(
        '사용 가능한 OPTIONS 값이 없습니다: ' + item.optionGroup
      );
    }

    applyListValidation_(
      item.sheetName,
      item.header,
      values
    );
  });

  applyNumberValidation_('SESSIONS', 'current_round', 0, 2);
  applyNumberValidation_('SESSIONS', 'max_teams', 3, 7);
  applyNumberValidation_('TEAMS', 'team_no', 1, 7);
  applyNumberValidation_('ASSIGNMENTS', 'round', 1, 2);
  applyNumberValidation_('ANSWERS', 'round', 1, 2);
  applyNumberValidation_('ANSWERS', 'confidence', 0, 100);
}

/**
 * 기본 시트 서식 설정
 */
function formatSheets_() {
  const spreadsheet = getSpreadsheet_();

  Object.keys(SHEET_SCHEMAS).forEach(function (sheetName) {
    const sheet = spreadsheet.getSheetByName(sheetName);
    const headers = SHEET_SCHEMAS[sheetName];

    sheet.setFrozenRows(1);

    const headerRange = sheet.getRange(
      1,
      1,
      1,
      headers.length
    );

    headerRange
      .setFontWeight('bold')
      .setBackground('#EDE7F6')
      .setFontColor('#241735')
      .setVerticalAlignment('middle');

    sheet.setRowHeight(1, 32);

    const existingFilter = sheet.getFilter();

    if (existingFilter) {
      existingFilter.remove();
    }

    sheet
      .getRange(
        1,
        1,
        sheet.getMaxRows(),
        headers.length
      )
      .createFilter();

    headers.forEach(function (header, index) {
      const column = index + 1;

      if (
        header.endsWith('_id') ||
        header === 'join_code' ||
        header.includes('token_hash')
      ) {
        sheet
          .getRange(2, column, sheet.getMaxRows() - 1, 1)
          .setNumberFormat('@');
      }

      if (header.endsWith('_at')) {
        sheet
          .getRange(2, column, sheet.getMaxRows() - 1, 1)
          .setNumberFormat('yyyy-mm-dd hh:mm:ss');
      }
    });
  });

  hideSensitiveColumns_();
}

/**
 * 민감한 열 숨김
 */
function hideSensitiveColumns_() {
  [
    {
      sheetName: 'SESSIONS',
      header: 'admin_token_hash',
    },
    {
      sheetName: 'TEAMS',
      header: 'team_token_hash',
    },
  ].forEach(function (item) {
    const sheet = getSpreadsheet_().getSheetByName(
      item.sheetName
    );

    const column = getHeaderColumn_(
      sheet,
      item.header
    );

    sheet.hideColumns(column);
  });
}

/**
 * SETTINGS와 OPTIONS 반환
 */
function getConfig_() {
  const settingsRows = readRowsAsObjects_('SETTINGS');
  const optionRows = readRowsAsObjects_('OPTIONS');

  const settings = {};

  settingsRows.forEach(function (row) {
    const key = String(row.setting_key || '').trim();

    if (!key) {
      return;
    }

    settings[key] = parseSettingValue_(
      row.value,
      row.value_type
    );
  });

  const options = {};

  optionRows
    .filter(function (row) {
      return normalizeBoolean_(row.enabled) === true;
    })
    .sort(function (a, b) {
      return Number(a.sort_order) - Number(b.sort_order);
    })
    .forEach(function (row) {
      const group = String(row.option_group);

      if (!options[group]) {
        options[group] = [];
      }

      options[group].push({
        key: String(row.option_key),
        label: String(row.display_label),
        order: Number(row.sort_order),
        color: String(row.color),
        description: String(row.description || ''),
      });
    });

  return {
    settings: settings,
    options: options,
    version: APP_VERSION,
  };
}

function getOptionKeys_(optionGroup) {
  return readRowsAsObjects_('OPTIONS')
    .filter(function (row) {
      return (
        String(row.option_group).trim() === optionGroup &&
        normalizeBoolean_(row.enabled) === true
      );
    })
    .sort(function (a, b) {
      return Number(a.sort_order) - Number(b.sort_order);
    })
    .map(function (row) {
      return String(row.option_key).trim();
    });
}

function applyListValidation_(sheetName, header, values) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const column = getHeaderColumn_(sheet, header);

  const validation = SpreadsheetApp
    .newDataValidation()
    .requireValueInList(values, true)
    .setAllowInvalid(false)
    .setHelpText('OPTIONS 시트에 정의된 값만 선택할 수 있습니다.')
    .build();

  sheet
    .getRange(2, column, sheet.getMaxRows() - 1, 1)
    .setDataValidation(validation);
}

function applyNumberValidation_(
  sheetName,
  header,
  minValue,
  maxValue
) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);
  const column = getHeaderColumn_(sheet, header);

  const validation = SpreadsheetApp
    .newDataValidation()
    .requireNumberBetween(minValue, maxValue)
    .setAllowInvalid(false)
    .setHelpText(
      minValue + '부터 ' + maxValue + ' 사이의 숫자를 입력하세요.'
    )
    .build();

  sheet
    .getRange(2, column, sheet.getMaxRows() - 1, 1)
    .setDataValidation(validation);
}

function readRowsAsObjects_(sheetName) {
  const sheet = getSpreadsheet_().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error('시트를 찾을 수 없습니다: ' + sheetName);
  }

  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2) {
    return [];
  }

  const values = sheet
    .getRange(1, 1, lastRow, lastColumn)
    .getValues();

  const headers = values.shift().map(function (header) {
    return String(header).trim();
  });

  return values
    .filter(function (row) {
      return row.some(function (value) {
        return value !== '';
      });
    })
    .map(function (row) {
      const result = {};

      headers.forEach(function (header, index) {
        result[header] = row[index];
      });

      return result;
    });
}

function getHeaderColumn_(sheet, header) {
  const lastColumn = sheet.getLastColumn();

  const headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getDisplayValues()[0];

  const index = headers.indexOf(header);

  if (index === -1) {
    throw new Error(
      sheet.getName() +
      ' 시트에서 머리글을 찾을 수 없습니다: ' +
      header
    );
  }

  return index + 1;
}

function getSpreadsheet_() {
  const spreadsheetId = PropertiesService
    .getScriptProperties()
    .getProperty('SPREADSHEET_ID');

  if (spreadsheetId) {
    return SpreadsheetApp.openById(spreadsheetId);
  }

  const activeSpreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();

  if (!activeSpreadsheet) {
    throw new Error(
      'SPREADSHEET_ID가 설정되지 않았습니다.'
    );
  }

  return activeSpreadsheet;
}

function parseSettingValue_(value, valueType) {
  switch (String(valueType).trim()) {
    case 'number':
      return Number(value);

    case 'boolean':
      return normalizeBoolean_(value);

    case 'text':
    default:
      return String(value);
  }
}

function normalizeBoolean_(value) {
  if (value === true || value === false) {
    return value;
  }

  const normalized = String(value).trim().toUpperCase();

  if (normalized === 'TRUE') {
    return true;
  }

  if (normalized === 'FALSE') {
    return false;
  }

  return null;
}

function parseRequestBody_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error('POST 요청 본문이 없습니다.');
  }

  try {
    return JSON.parse(e.postData.contents);
  } catch (error) {
    throw new Error('JSON 요청 형식이 올바르지 않습니다.');
  }
}

function verifyApiSecret_(receivedSecret) {
  const expectedSecret = PropertiesService
    .getScriptProperties()
    .getProperty('API_SECRET');

  if (
    !expectedSecret ||
    !receivedSecret ||
    String(receivedSecret) !== String(expectedSecret)
  ) {
    throw new Error('API 인증에 실패했습니다.');
  }
}

function createSecret_() {
  return (
    Utilities.getUuid().replace(/-/g, '') +
    Utilities.getUuid().replace(/-/g, '')
  );
}

function columnToLetter_(column) {
  let result = '';
  let number = column;

  while (number > 0) {
    const remainder = (number - 1) % 26;

    result =
      String.fromCharCode(65 + remainder) +
      result;

    number = Math.floor((number - 1) / 26);
  }

  return result;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function errorResponse_(error) {
  console.error(error);

  return jsonResponse_({
    ok: false,
    error:
      error && error.message
        ? error.message
        : '알 수 없는 오류가 발생했습니다.',
    timestamp: new Date().toISOString(),
  });
}
