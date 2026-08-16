ASC 粘贴指南（Yuun 1.0 首发，no-IAP 版）
=====================================

通用规则：
- 用 TextEdit 打开 .txt 再复制；禁止从 aso-metadata.json 直接拷（\n 会变字面量）。
- Description 禁止 < > \ 字符（含 "->"）。
- Keywords 逗号分隔、逗号后无空格（文件内容已是最终格式，直接整行复制）。
- 文件生成自 apps/auspice-app/aso-metadata.json（2026-08-16 修正版：
  已删除"右滑月历/左滑设置"两处与真实交互不符的表述；no-IAP 首发不放 Pro 定价）。

字段 → 文件 对照（每 locale 一套）：
  Name                 → <locale>-title.txt
  Subtitle             → <locale>-subtitle.txt
  Keywords             → <locale>-keywords.txt
  Promotional Text     → <locale>-promotionalText.txt
  Description          → <locale>-description.txt
  What's New (1.0)     → <locale>-whatsNew.txt

全局字段：
  Support URL          → supportUrl.txt   (https://useone.tech)
  Marketing URL        → marketingUrl.txt (https://yuun.hexastral.com)
  Version              → version.txt      (1.0)
  Copyright            → copyright.txt    (© 2026 UseONE, LLC)

审核备注（App Review Information → Notes）→ en-US-review-notes.txt

ASC 操作路径（每 locale 一次）：
  App → iOS App 版本 1.0 → App Store → 语言旁 "+" 或编辑对应语言 →
  逐字段粘贴上述文件内容 → Save。
