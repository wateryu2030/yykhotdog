import os, textwrap, shutil, datetime
BASE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def ensure_dir(p): os.makedirs(os.path.dirname(p), exist_ok=True)
def backup(p):
    if os.path.exists(p):
        ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        shutil.copy2(p, f"{p}.{ts}.bak")
        print(f"🛟 Backup {p}")

FILES = {}

# 1️⃣ Dockerfile.dev - backend
FILES["backend/Dockerfile.dev"] = r"""
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install -g ts-node-dev nodemon && npm install
COPY . .
EXPOSE 3001
CMD ["npx", "ts-node-dev", "--respawn", "--transpile-only", "src/index.ts"]
"""

# 2️⃣ Dockerfile.dev - frontend
FILES["frontend/Dockerfile.dev"] = r"""
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]
"""

# 3️⃣ docker-compose.dev.yml
FILES["docker-compose.dev.yml"] = r"""
version: "3.9"
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      SA_PASSWORD: "YourStrong!Passw0rd"
      ACCEPT_EULA: "Y"
    ports:
      - "1433:1433"
    volumes:
      - ./database:/var/opt/mssql/backup
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - DB_HOST=mssql
      - DB_PORT=1433
      - DB_USER=sa
      - DB_PASS=YourStrong!Passw0rd
    ports:
      - "3001:3001"
    depends_on:
      - mssql
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
    ports:
      - "3000:3000"
    depends_on:
      - backend
"""

# 4️⃣ 新模块 - insights.controller.ts
FILES["backend/src/modules/insights/insights.controller.ts"] = r"""
import { Request, Response } from "express";
import { sequelize } from "../../config/database";
import { QueryTypes } from "sequelize";

/**
 * 智能驾驶舱 AI 建议接口
 * 规则化诊断 + 简易智能打分
 */
export class InsightsController {
  async suggestions(req: Request, res: Response) {
    const { scope = "city", from = 0, to = 99999999 } = req.query as any;
    const table = scope === "store" ? "vw_kpi_store_daily" : "vw_kpi_city_daily";

    const rows:any[] = await sequelize.query(`
      SELECT ${scope==="store"?"store_name":"city"} AS dim,
             SUM(revenue) AS revenue,
             SUM(gross_profit) AS gross_profit,
             SUM(net_profit) AS net_profit,
             CASE WHEN SUM(revenue)>0 THEN SUM(gross_profit)/SUM(revenue) ELSE 0 END AS gross_margin,
             AVG(orders_cnt) AS orders_avg
      FROM ${table}
      WHERE date_key BETWEEN ${from} AND ${to}
      GROUP BY ${scope==="store"?"store_name":"city"}
    `, { type: QueryTypes.SELECT });

    const suggestions = rows.map(r => {
      const tips:string[] = [];
      const gm = Number(r.gross_margin||0);
      const rev = Number(r.revenue||0);
      const net = Number(r.net_profit||0);
      const ord = Number(r.orders_avg||0);

      if (rev === 0) tips.push("⚠️ 收入为 0，门店可能未运营或数据异常。");
      if (gm < 0.35) tips.push("🔻 毛利率偏低，建议检查原料成本或折扣策略。");
      if (net < 0) tips.push("💸 净利为负，建议复盘期间费用与销售结构。");
      if (ord < 10) tips.push("🧊 订单量偏低，需强化促销活动或提高曝光。");
      if (gm >= 0.5 && net > 0) tips.push("✅ 表现良好，可考虑扩大营销预算或新店复制。");

      return {
        dimension: r.dim,
        revenue: rev,
        gross_profit: r.gross_profit,
        net_profit: r.net_profit,
        gross_margin: gm,
        orders_avg: ord,
        advice: tips
      };
    });

    res.json({ scope, from, to, suggestions });
  }
}
"""

# 5️⃣ 新模块 - insights.routes.ts
FILES["backend/src/modules/insights/insights.routes.ts"] = r"""
import { Router } from "express";
import { InsightsController } from "./insights.controller";
export const insightsRouter = Router();
const ctl = new InsightsController();
insightsRouter.get("/suggestions", ctl.suggestions);
"""

# 6️⃣ 更新模块注册 index.ts
FILES["backend/src/modules/index.ts"] = r"""
export { metricsRouter } from './metrics/metrics.routes';
export { alertsRouter } from './alerts/alerts.routes';
export { siteRouter } from './site/site.routes';
export { siteSelectionRouter } from './siteSelection/siteSelection.routes';
export { openingRouter } from './opening/opening.routes';
export { operationsRouter } from './operations/operations.routes';
export { salesRouter } from './sales/sales.routes';
export { allocationRouter } from './allocation/allocation.routes';
export { profilesRouter } from './profiles/profiles.routes';
export { insightsRouter } from './insights/insights.routes';
"""

def write(rel, content):
    path = os.path.join(BASE, rel)
    ensure_dir(path)
    backup(path)
    with open(path, "w", encoding="utf-8") as f:
        f.write(textwrap.dedent(content).lstrip("\n"))
    print(f"✅ Wrote {rel}")

def main():
    for rel, content in FILES.items():
        write(rel, content)
    print("\n🎯 Dev Docker + AI 建议模块已生成！")
    print("➡ 使用步骤：")
    print("1️⃣ 启动开发环境: docker-compose -f docker-compose.dev.yml up --build")
    print("2️⃣ 浏览器访问: http://localhost:3000/dashboard")
    print("3️⃣ 调用建议接口: GET http://localhost:3001/api/insights/suggestions?scope=city&from=20251001&to=20251020")
    print("   返回示例: { dimension, revenue, gross_margin, advice: [..] }")
    print("4️⃣ 前端可在 DashboardHotdog.tsx 中展示建议卡（AI 建议面板）")

if __name__ == "__main__":
    main()
