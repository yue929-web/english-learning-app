import type { Word, Meaning } from '../types';

// 解析后的原始词条
export interface RawWord {
  word: string;
  phoneticUk?: string;
  phoneticUs?: string;
  meanings: Meaning[];
}

/**
 * 解析 JSON 格式词库
 * 支持格式：
 * 1. [{ "word": "apple", "phonetic": "/ˈæpl/", "meaning": "苹果" }]
 * 2. [{ "word": "apple", "phoneticUk": "...", "phoneticUs": "...", "meanings": [{pos:"n.", def:"苹果"}] }]
 * 3. [{ "headWord": "apple", "trans": [{pos:"n.", tranCn:"苹果"}] }] (有道格式)
 */
export function parseJson(content: string): RawWord[] {
  const data = JSON.parse(content);
  if (!Array.isArray(data)) throw new Error('JSON 根节点必须是数组');

  return data.map((item: any, i: number) => {
    const word = (item.word || item.headWord || item.en || item.english || '').trim();
    if (!word) throw new Error(`第 ${i + 1} 条缺少单词`);

    // 音标
    let phoneticUk = item.phoneticUk || item.uk || item.phonetic || '';
    let phoneticUs = item.phoneticUs || item.us || item.phonetic || '';
    if (!phoneticUk && !phoneticUs && item.phonetic) {
      phoneticUk = item.phonetic;
      phoneticUs = item.phonetic;
    }

    // 释义
    let meanings: Meaning[] = [];
    if (Array.isArray(item.meanings)) {
      meanings = item.meanings.map((m: any) => ({
        pos: m.pos || m.partOfSpeech || '',
        def: m.def || m.meaning || m.tranCn || '',
      }));
    } else if (Array.isArray(item.trans)) {
      meanings = item.trans.map((t: any) => ({
        pos: t.pos || t.partOfSpeech || '',
        def: t.tranCn || t.def || t.meaning || '',
      }));
    } else if (item.meaning || item.def || item.cn || item.chinese) {
      meanings = [{ pos: '', def: (item.meaning || item.def || item.cn || item.chinese).toString() }];
    }

    if (meanings.length === 0) {
      meanings = [{ pos: '', def: '' }];
    }

    return { word, phoneticUk, phoneticUs, meanings };
  });
}

/**
 * 解析 CSV / TXT 格式词库
 * 支持分隔符：逗号、制表符、竖线、分号
 * 每行格式：单词,音标,释义  或  单词,释义  或  单词 释义
 */
export function parseCsv(content: string): RawWord[] {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) throw new Error('文件为空');

  // 检测分隔符
  const firstLine = lines[0];
  let delimiter: string | RegExp = '\t';
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.includes(',')) delimiter = ',';
  else if (firstLine.includes('|')) delimiter = '|';
  else if (firstLine.includes(';')) delimiter = ';';
  else delimiter = /\s+/;

  // 检测是否有表头
  const headerTest = lines[0].toLowerCase();
  const hasHeader = /word|单词|english/i.test(headerTest) &&
    (/meaning|释义|中文|chinese/i.test(headerTest) || /phonetic|音标/i.test(headerTest));

  const startIdx = hasHeader ? 1 : 0;
  const result: RawWord[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let parts: string[] = line.split(delimiter).map(p => p.trim());

    if (parts.length < 2) continue;

    const word = parts[0];
    if (!word) continue;

    // 根据列数判断：word, [phonetic], meaning
    let phoneticUk = '';
    let phoneticUs = '';
    let meaning = '';

    if (parts.length >= 3) {
      // word, phonetic, meaning
      const mid = parts[1];
      if (/^[\/\[].*[\/\]]$/.test(mid) || mid.includes('ˈ') || mid.includes('ə')) {
        phoneticUk = mid;
        phoneticUs = mid;
        meaning = parts.slice(2).join(delimiter === '|' ? '|' : ',');
      } else {
        meaning = parts.slice(1).join(delimiter === '|' ? '|' : ',');
      }
    } else {
      // word, meaning
      meaning = parts[1];
    }

    result.push({
      word,
      phoneticUk,
      phoneticUs,
      meanings: [{ pos: '', def: meaning }],
    });
  }

  if (result.length === 0) throw new Error('未解析到有效单词，请检查格式');
  return result;
}

/**
 * 自动识别格式并解析
 */
export function parseWordFile(content: string, fileName: string): RawWord[] {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    return parseJson(content);
  }
  return parseCsv(content);
}

/**
 * 给解析后的词条分配 id，转换为 Word 类型
 */
export function rawWordsToWords(raws: RawWord[]): Word[] {
  return raws.map((r, i) => ({
    id: `import_${Date.now()}_${i}`,
    word: r.word,
    phoneticUk: r.phoneticUk || '',
    phoneticUs: r.phoneticUs || '',
    meanings: r.meanings,
  }));
}
