# 魔方打乱与计时模拟器 (Rubik's Cube Scramble & Timer Simulator)

这是一个基于 Web 的魔方打乱、计时与底层十字（Cross）求解模拟器。项目集成了 3D 魔方可视化渲染、WCA 官方打乱规则（部分项目）以及高度优化的 3x3x3 十字求解算法（IDA*）。

## 功能特性

- **多项目支持**：支持 2x2x2 至 7x7x7 高阶魔方，以及魔表 (Clock)、五魔方 (Megaminx)、金字塔 (Pyraminx)、斜转魔方 (Skewb) 和 Square-1。
- **3D 可视化**：集成 `cubing.js` 的 `<twisty-player>`，实时根据打乱公式同步渲染魔方状态。
- **专业计时系统**：
  - 支持 WCA 规则的 15 秒倒计时观察（Inspection）。
  - 观察超时自动判定 DNF。
  - 毫秒级高精度计时。
- **成绩统计与管理**：自动计算总次数（Count）、单次平均（Mean）以及滚动平均（Ao12），支持单次成绩删除与清空成绩列表。
- **高性能 Cross 求解器**：专为 3x3x3 设计，采用原位修改、轴剪枝与启发式估计的 **IDA*（迭代加深 A*）搜索算法**，可在几毫秒内精确算出 8 步以内的最优底层十字解法。支持白、黄、绿、蓝、红、橙六色底色选择。

## 文件结构

```text
├── index.html
├── css/
│   └── style.css
└── js/
    ├── cross-solver.js
    ├── script.js
    └── viewer.js