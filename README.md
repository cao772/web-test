# AI 数据中心数字孪生 Demo

浏览器直接运行的 3D 数据中心数字孪生原型，目标是继续扩展 AI Coding Agent + Digital Twin 的可交互演示效果。

## v0.3 当前已实现

- Three.js / React Three Fiber 3D 机房场景
- 10 个可点击机柜、80 个计算节点、640 张模拟 H100 GPU
- 机房墙体、立柱、顶灯、线缆桥架、CRAC、PDU
- 机柜服务器层、状态灯、玻璃机柜门、设备正面风扇与端口细节
- 点击机柜后镜头电影化聚焦
- 再点击具体计算节点后自动开机柜门、拉出目标节点并进入设备级近景
- 设备级温度、功率、显存、网络与 8 GPU 负载详情
- GPU 利用率 / 温度 / 功率 / 网络等实时模拟数据
- 温度热力图、网络拓扑、动态网络光点、冷通道气流
- Bloom 发光与暗角后处理
- 自动巡航模式
- CRAC-02 → RACK-07 冷却故障注入、传播路径高亮与热羽流
- 正常 / 预警 / 严重三级状态
- AI 场景控制器：自然语言指令直接驱动镜头、设备定位和故障链

## Agent 演示指令

可直接在页面底部 AI 场景控制器输入：

```text
定位最热设备
检查 RACK-07 GPU-6
显示故障链
恢复全景
```

其中“检查 RACK-07 GPU-6”会自动：定位机柜 → 打开机柜门 → 拉出 NODE-06 → 镜头进入设备级视角 → 右侧展示节点指标。

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

1. 用 GLTF/GLB 精细资产替换部分程序化设备模型。
2. 增加冷热通道玻璃门、架空地板反射与更真实的机房材质。
3. 接 Prometheus / DCGM / Redfish / SNMP 实时数据接口。
4. 将当前本地规则式 Agent 控制器替换为真实大模型 + Tool Calling。
5. 增加 Agent 自动根因分析、处置动作模拟和前后状态对比。
