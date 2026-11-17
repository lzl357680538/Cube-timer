export function parseMoves(text) {
  const input = text.replace(/[’‘′]/g, "'");
  const token = /(?:[UDLRFB]w|[UDLRFBudlrfbxyzMES])(?:2'?|')?/y;
  const moves = [];
  let offset = 0;
  while (offset < input.length) {
    if (/\s/.test(input[offset])) {
      offset++;
      continue;
    }
    token.lastIndex = offset;
    const match = token.exec(input);
    if (!match)
      throw new Error(
        `第 ${offset + 1} 个字符附近无法识别。支持面转 U/R/F/D/L/B、宽转 u/r/f/d/l/b（或 Rw 等）、转体 x/y/z 和中层 M/E/S，后缀用 ' 或 2。`,
      );
    moves.push(
      match[0]
        .replace(/^([UDLRFB])w/, (_, face) => face.toLowerCase())
        .replace("2'", "2"),
    );
    if (moves.length > 500) throw new Error("每个公式最多输入 500 步。");
    offset = token.lastIndex;
  }
  return moves;
}

// Cross tables contain only the 18 outer-face moves. Keep their input strict.
export function parseFaceMoves(text) {
  const moves = parseMoves(text);
  if (moves.some((move) => !/^[UDLRFB]/.test(move)))
    throw new Error("Cross / XCross 仅支持 U D L R F B 及其逆转、半转。");
  return moves;
}

export function invertAlgorithm(text) {
  return parseMoves(text)
    .reverse()
    .map((move) =>
      move.endsWith("2")
        ? move
        : move.endsWith("'")
          ? move.slice(0, -1)
          : move + "'",
    )
    .join(" ");
}
