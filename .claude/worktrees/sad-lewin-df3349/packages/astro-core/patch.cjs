const fs = require('fs')
const file = '../../apps/hexastral-api/src/routes/yiching/divination.ts'
let code = fs.readFileSync(file, 'utf8')

// Replace the last `  })` with `.get('/history')` to keep the chaining
code = code.replace(
  /    return c\.json\(\{ data: bookmarks \}\)\n  \}\)$/,
  `    return c.json({ data: bookmarks })
  })

  /** 获取占卜记录 */
  .get('/history/:userId', async (c) => {
    const userId = requireUserId(c)
    const db = c.get('db')

    const history = await db
      .select()
      .from(divinations)
      .where(eq(divinations.userId, userId))
      .orderBy(desc(divinations.createdAt))
      .limit(50)

    return c.json({ data: history })
  })`
)
fs.writeFileSync(file, code)
