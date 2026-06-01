const fs = require('fs')
const file = '../../apps/hexastral-api/src/routes/yiching/divination.ts'
let code = fs.readFileSync(file, 'utf8')
code += `
  /** 获取占卜历史记录 */
  .get('/history/:userId', async (c) => {
    const userId = requireUserId(c);
    const db = c.get('db');

    const history = await db
      .select()
      .from(divinations)
      .where(eq(divinations.userId, userId))
      .orderBy(desc(divinations.createdAt))
      .limit(50);

    return c.json({ data: history });
  });
`
fs.writeFileSync(file, code)
