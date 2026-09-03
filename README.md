# AI 数据中心数字孪生 Demo

浏览器直接运行的 3D 数据中心数字孪生原型，目标是继续扩展 AI Coding Agent + Digital Twin 的可交互演示效果。

## v0.4 当前已实现

- Three.js / React Three Fiber 3D 机房场景
- 10 个可点击机柜、80 个计算节点、640 张模拟 H100 GPU
- 机房墙体、立柱、顶灯、线缆桥架、CRAC、PDU
- 架空地板反射材质，可反射机柜、灯带和故障发光
- 冷通道蓝色灯带、热通道橙/红灯带与动态光点
- 机柜金属 Clearcoat 材质、玻璃门、服务器风扇、端口与状态灯
- 点击机柜后电影化镜头聚焦
- 点击具体计算节点后自动开门、拉出节点并进入设备级近景
- 设备级温度、功率、显存、网络与 8 GPU 负载详情
- GPU 利用率 / 温度 / 功率 / 网络等实时模拟数据
- 温度热力图、网络拓扑、动态网络光点、冷通道气流
- Bloom 发光与暗角后处理
- 自动电影巡航模式
- CRAC-02 → RACK-07 冷却故障注入、传播路径高亮与热羽流
- 正常 / 预警 / 严重三级状态
- Agent 场景控制器：自然语言驱动镜头、设备定位、热力图和故障链
- 新增结构化 Agent Tool Runtime，工具调用与场景执行逻辑分离
- 页面可直接查看每次 Agent 实际调用的场景工具和执行结果

## 当前 Agent 工具

```text
focus_hottest
focus_rack
inspect_node
set_heatmap
set_network
set_airflow
set_incident
reset_view
```

这些工具已经采用独立 schema / runtime 结构。后续接真实大模型 Tool Calling 时，可以将模型产生的 tool_calls 直接映射到当前执行层，而无需重写 3D 场景控制逻辑。

## Agent 演示指令

可直接在页面 Agent 控制台输入：

```text
定位最热设备
检查 RACK-07 GPU-6
显示故障链
关闭热力图
解除故障
恢复全景
```

其中“检查 RACK-07 GPU-6”会自动：定位机柜 → 打开机柜门 → 拉出 NODE-06 → 镜头进入设备级视角 → 右侧展示节点指标，并在工具调用日志中记录 `inspect_node`。

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 Vite 输出的本地地址即可。

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

1. 增加真实 GLTF/GLB GPU 服务器、交换机、CRAC 精细资产。
2. 给 Agent Runtime 接真实 OpenAI-compatible 模型 Tool Calling 接口。
3. 接 Prometheus / DCGM / Redfish / SNMP 实时数据接口。
4. 增加 Agent 自动根因分析、处置动作模拟和处置前后状态对比。
5. 增加可录制的自动演示脚本：全景 → 告警 → 根因定位 → 设备拆解 → 处置 → 恢复。
