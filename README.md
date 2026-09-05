# AI 数据中心数字孪生 Demo

浏览器直接运行的 3D 数据中心数字孪生原型，目标是继续扩展 AI Coding Agent + Digital Twin 的可交互演示效果。

## v0.6 当前已实现

- Three.js / React Three Fiber 3D 机房场景
- 10 个可点击机柜、80 个计算节点、640 张模拟 H100 GPU
- 机房墙体、立柱、顶灯、线缆桥架、CRAC、PDU
- 架空地板反射、冷热通道灯带、动态网络光流、冷通道气流、Bloom 与暗角
- 机柜金属 Clearcoat、玻璃门、服务器风扇、端口与状态灯
- 机柜级 / 节点级电影化镜头，节点检查时自动开门并拉出服务器
- CRAC-02 → RACK-07 冷却故障注入、传播路径高亮与热羽流
- Agent 场景工具运行时、工具调用日志与可插拔模型规划接口
- `mitigate_incident` 临时降载处置工具
- 一键自动处置：正常基线 → 异常出现 → 根因定位 → 节点检查 → 临时降载 → 恢复制冷 → 前后对比
- 自动保存 RACK-07 处置前后快照并对比温度、GPU、功率、风扇和状态
- 新增 v0.6 导演模式：开场标题、REC 标识、阶段字幕、镜头说明、故障定位 HUD、演示进度和最终总结页
- 导演模式运行时自动淡出普通业务面板，适合直接全屏录屏
- 演示结束后自动生成任务完成页，可直接“重新演示”或退出导演模式

## 导演模式演示

页面左侧点击：

```text
◉ 导演模式演示
```

会先播放开场标题，然后自动执行 7 个场景：

```text
1. 建立正常运行基线
2. CRAC-02 冷却异常出现
3. Agent 锁定 CRAC-02 → RACK-07 故障链
4. 进入 RACK-07，开门并拉出 NODE-06
5. 将 GPU 负载目标调整到 68%，提高风扇转速
6. CRAC-02 恢复制冷，温度开始回落
7. 返回 RACK-07 验证处置效果
```

导演画面会自动显示：

```text
REC 录制标识
阶段编号 / 阶段标题 / 字幕
当前镜头类型
CRAC-02 → RACK-07 故障定位 HUD
RACK-07 温度 / GPU / 功率 / 处置状态
全流程进度条
最终处置结果总结页
```

## 当前 Agent 工具

```text
focus_hottest
focus_rack
inspect_node
set_heatmap
set_network
set_airflow
set_incident
mitigate_incident
reset_view
```

## Agent 手动指令

```text
定位最热设备
检查 RACK-07 GPU-6
显示故障链
处置 RACK-07 降载到 68%
恢复制冷
恢复全景
```

## 可选真实模型规划接口

前端不会保存模型密钥。真实模型应放在后端，由后端返回结构化 `tool_calls`。

```bash
VITE_AGENT_ENDPOINT=/api/agent/plan
npm run dev
```

未配置接口、接口调用失败或返回无效工具时，会自动回退本地工具规划，不影响演示。

## 本地运行

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

## 当前开发分支

```text
digital-twin-v1
```

拉取：

```bash
git clone https://github.com/cao772/web-test.git
cd web-test
git checkout digital-twin-v1
npm install
npm run dev
```

## 下一阶段

1. 增加 `/api/agent/plan` 示例后端，直接接 OpenAI-compatible Tool Calling 模型。
2. 增加真实 GLTF/GLB GPU 服务器、交换机、CRAC 精细资产。
3. 接 Prometheus / DCGM / Redfish / SNMP 实时数据接口。
4. 增加多故障场景：供电异常、网络丢包、GPU 过热、风扇故障。
5. 增加导演模式多剧本选择与不同处置策略对比。
