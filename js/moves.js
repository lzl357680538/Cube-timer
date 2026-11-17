export function parseMoves(text) {
  const tokens = text.trim() ? text.trim().split(/\s+/) : [];
  if (tokens.length > 500) throw new Error("每个状态最多输入 500 步。");
  if (tokens.some((move) => !/^[UDLRFB](?:2|'|2')?$/.test(move)))
    throw new Error("仅支持 U D L R F B，以及 '、2 后缀；每步用空格分隔。");
  return tokens.map((move) => move.replace("2'", "2"));
}
