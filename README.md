# AI 数据中心数字孪生 Demo

浏览器直接运行的 3D 数据中心数字孪生原型，目标是继续扩展 AI Coding Agent + Digital Twin 的可交互演示效果。

## v0.5 当前已实现

- Three.js / React Three Fiber 3D 机房场景
- 10 个可点击机柜、80 个计算节点、640 张模拟 H100 GPU
- 机房墙体、立柱、顶灯、线缆桥架、CRAC、PDU
- 架空地板反射材质，可反射机柜、灯带和故障发光
- 冷通道蓝色灯带、热通道橙/红灯带与动态光点
- 机柜金属 Clearcoat 材质、玻璃门、服务器风扇、端口与状态灯
- 点击机柜后电影化镜头聚焦；点击计算节点后自动开门、拉出节点并进入设备级近景
- 设备级温度、功率、显存、网络与 8 GPU 负载详情
- 温度热力图、网络拓扑、动态网络光点、冷通道气流、Bloom 与暗角
- CRAC-02 → RACK-07 冷却故障注入、传播路径高亮与热羽流
- Agent 场景工具运行时与工具调用日志
- 新增 `mitigate_incident` 临时降载处置工具
- 新增一键自动演示：正常基线 → 异常出现 → 根因定位 → 节点检查 → 临时降载 → 恢复制冷 → 前后对比
- 自动演示每一步均复用实际 Agent 场景工具，不是独立假动画
- 自动保存 RACK-07 处置前、处置后快照，并显示温度 / GPU / 功率 / 风扇 / 状态前后变化
- 新增可插拔模型规划适配层；未配置模型时自动回退本地工具规划

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

## 一键自动演示

页面左侧点击：

```text
▶ 一键自动演示
```

自动执行 7 个阶段：

```text
1. 建立正常基线
2. CRAC-02 冷却异常出现
3. Agent 定位最高温机柜与故障链
4. 进入 RACK-07 并拉出 NODE-06
5. GPU 临时降载至 68%，提高风扇转速
6. CRAC-02 恢复制冷
7. 生成处置前后状态对比
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

前端不会保存或提交模型密钥。真实模型应放在后端，由后端返回结构化 `tool_calls`。

例如启动前设置：

```bash
VITE_AGENT_ENDPOINT=/api/agent/plan
npm run dev
```

前端会向该地址发送：用户指令、当前场景摘要、已注册工具 schema。若接口未配置、调用失败或返回无效工具，自动回退本地规划，不影响 Demo 使用。

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

1. 增加可直接录屏的“演示导演模式”：字幕、阶段转场和固定镜头路径。
2. 实现 `/api/agent/plan` 示例后端，接 OpenAI-compatible Tool Calling 模型。
3. 接 Prometheus / DCGM / Redfish / SNMP 实时数据接口。
4. 加入真实 GLTF/GLB GPU 服务器、交换机、CRAC 精细资产。
5. 扩展多故障场景与 Agent 处置策略对比。
