#!/usr/bin/env perl
# Rename: yuan/Yuan → kindred/Kindred  (brand only).
# Protects: SanYuan, YuanYun*, currentYuanYun, yuanYunForYear, buildYuanYun,
#           sanYuan, current_yuan_yun, yuanxiao (元宵 festival), 緣 / 缘 in
#           historical comments (handled separately below).
use strict; use warnings;
local $/;
while (my $s = <>) {

  # 1. Brand PascalCase identifiers (whole-word, case-sensitive). \b protects
  #    YuanYun*, SanYuan, YuanYunInfo because the next char after "Yuan" is
  #    another word char (Y, n, etc.). For standalone "Yuan", \b matches.
  my @pascal = qw(
    YuanBondsRpc
    YuanClientGateProps YuanClientGate
    YuanClientProviderProps YuanClientProvider
    YuanClientConfig
    YuanContext
    YuanInviteClientProps YuanInviteClient
    YuanInviteTeaserPage YuanInvitePage
    YuanLandingPageProps YuanLandingPage
    YuanOfferings
    YuanProStatus
    YuanPurchaseResult
    YuanReportSharePage
    YuanSealProps YuanSealMode YuanSeal
    YuanStartPage
    YuanTheme
    YuanUserProfile
    YuanWidgetData
  );
  for my $n (@pascal) {
    (my $new = $n) =~ s/^Yuan/Kindred/;
    $s =~ s/\b\Q$n\E\b/$new/g;
  }
  # Standalone PascalCase "Yuan" — \b protects YuanYun, SanYuan, YuanYunInfo etc.
  $s =~ s/\bYuan\b/Kindred/g;

  # 2. camelCase + brand identifiers (preserving metaphysics).
  my %camel = (
    useYuanClient         => 'useKindredClient',
    useYuanContext        => 'useKindredContext',
    yuanBonds             => 'kindredBonds',
    buildYuanComposeUrl   => 'buildKindredComposeUrl',
    yuanComposeCta        => 'kindredComposeCta',
    yuanComposeLunarNote  => 'kindredComposeLunarNote',
    # Theme tokens used everywhere in yuan-app
    yuanDark              => 'kindredDark',
    yuanLight             => 'kindredLight',
    yuanType              => 'kindredType',
    yuanSpacing           => 'kindredSpacing',
    yuanPresets           => 'kindredPresets',
    yuanRadius            => 'kindredRadius',
  );
  for my $k (keys %camel) {
    my $v = $camel{$k};
    $s =~ s/\b\Q$k\E\b/$v/g;
  }

  # 3. Storage keys: 'yuan.foo' → 'kindred.foo'
  $s =~ s/'yuan\.([\w.-]+)'/'kindred.$1'/g;
  $s =~ s/"yuan\.([\w.-]+)"/"kindred.$1"/g;

  # 4. API routes
  $s =~ s{/api/yuan/}{/api/kindred/}g;
  $s =~ s{/api/yuan\b}{/api/kindred}g;

  # 5. RC entitlement + IAP product IDs.
  # The yuan IAP IDs have prefix `hexastral_yuan_pro_*` — rename to keep prefix.
  $s =~ s/\bhexastral_yuan_pro_monthly\b/hexastral_kindred_pro_monthly/g;
  $s =~ s/\bhexastral_yuan_pro_annual\b/hexastral_kindred_pro_annual/g;
  $s =~ s/\bhexastral_yuan_pro\b/hexastral_kindred_pro/g;
  $s =~ s/\byuan_pro_monthly\b/kindred_pro_monthly/g;
  $s =~ s/\byuan_pro_annual\b/kindred_pro_annual/g;
  $s =~ s/\byuan_pro\b/kindred_pro/g;

  # 6. Funnel attribution strings (single + double quoted: `'yuan'` as a value)
  $s =~ s/'yuan'(?=\s*[,)\}\]])/'kindred'/g;
  $s =~ s/"yuan"(?=\s*[,)\}\]:])/"kindred"/g;
  $s =~ s/PORTFOLIO_TARGET_APP\s*=\s*'yuan'/PORTFOLIO_TARGET_APP = 'kindred'/g;
  $s =~ s/target_app:\s*'yuan'/target_app: 'kindred'/g;
  $s =~ s/targetApp:\s*'yuan'/targetApp: 'kindred'/g;

  # 7. Growth-funnel slugs (discover_yuan_title etc.)
  $s =~ s/\bdiscover_yuan_/discover_kindred_/g;
  $s =~ s/\bcurrent_yuan(?!_yun)\b/current_kindred/g; # preserve current_yuan_yun
  $s =~ s/\byuan_current\b/kindred_current/g;

  # 8. Bundle / package / workspace refs
  $s =~ s/com\.hexastral\.yuan/com.hexastral.kindred/g;
  $s =~ s{\@zhop/yuan-app}{\@zhop/kindred-app}g;
  $s =~ s{\@zhop/scenario-yuan}{\@zhop/scenario-kindred}g;

  # 9. Path refs
  $s =~ s{apps/yuan-app/}{apps/kindred-app/}g;
  $s =~ s{apps/yuan-app\b}{apps/kindred-app}g;
  $s =~ s{packages/scenario-yuan/}{packages/scenario-kindred/}g;
  $s =~ s{packages/scenario-yuan\b}{packages/scenario-kindred}g;

  # 10. The brand name "Yuán" (accented romanization in user-facing strings) → Kindred
  $s =~ s/\bYuán\b/Kindred/g;

  # 11. Drop 緣 / 缘 from BRAND strings only — leave in 缘分 / 因缘 / similar compounds.
  # Heuristic: 緣 as a STANDALONE char between non-CJK boundaries is brand;
  # 缘分, 因缘, 姻缘 are compounds with adjacent CJK chars → leave alone.
  # This is conservative — review the diff for any leakage.
  $s =~ s/(?<![\p{Han}])緣(?![\p{Han}])/Kindred/g;
  $s =~ s/(?<![\p{Han}])缘(?![\p{Han}])/Kindred/g;

  print $s;
}
