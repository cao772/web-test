# AI 数据中心数字孪生 Demo

一个浏览器直接运行的 3D 数据中心数字孪生原型，目标是复刻并继续扩展 Joey 展示的那类 AI Coding Agent + Digital Twin 效果。

## 当前已实现

- Three.js / React Three Fiber 3D 机房场景
- 10 个可点击机柜、80 个模拟 GPU 节点
- 机柜服务器层、状态灯、机柜标签
- GPU 利用率 / 温度 / 功率 / 网络等实时模拟数据
- 点击机柜后镜头聚焦并联动右侧设备详情
- 温度热力图开关
- 网络拓扑连线开关
- 冷通道气流粒子开关
- 自动巡航模式
- RACK-07 冷却故障注入 / 解除
- 故障时温度、GPU、风扇、功率连续变化
- 正常 / 预警 / 严重三级状态
- AI 诊断建议卡片
- 实时事件流

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

## 下一阶段方向

1. 加入更精细的机柜 / GPU / CRAC / PDU 3D 模型。
2. 增加机房墙体、冷/热通道、线缆桥架与更接近真实数据中心的灯光。
3. 接真实 Prometheus / DCGM / Redfish / SNMP 数据。
4. 将 AI Agent 接到设备状态、告警和 3D 高亮联动上。
5. 增加故障链路推演、自动定位和处置动作模拟。
