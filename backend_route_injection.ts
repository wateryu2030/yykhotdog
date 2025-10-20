// 自动注入到 backend/src/index.ts 的路由代码
// 在现有的 app.use 路由注册后添加以下代码：

// 新增业务模块API路由
import { metricsRouter, segmentsRouter, siteRouter, alertsRouter } from './modules';

app.use('/api/metrics', metricsRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/site-scores', siteRouter);
app.use('/api/alerts', alertsRouter);