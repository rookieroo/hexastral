#!/usr/bin/env perl
# Rename script: cycle/Cycle → auspice/Auspice across the monorepo.
# Skips Lifecycle/Cycles/billingCycle/cycleCount/etc. via word boundaries.
# Run as: find ... -print0 | xargs -0 perl -i scripts/rename-cycle-to-auspice.pl
use strict; use warnings;

# Slurp + transform + print, ONCE PER FILE in @ARGV.
local $/;
while (my $s = <>) {

  # 1. PascalCase brand identifiers (whole-word, longer-first not required with \b).
  for my $n (qw(
    CycleAccentVariant
    CycleBirthInfoStored CycleBirthInfo
    CycleDayPayload CycleDay
    CycleEvent
    CycleExplainResult
    CycleFestival
    CycleHomeStackLayout
    CycleHour
    CycleMonthDay CycleMonthPayload
    CyclePaywallSheet
    CyclePersonalization CyclePerson
    CycleSearchPayload CycleSearchResult
    CycleSolarTermEntry
    CycleWidgetData CycleWidget
    CycleYearOverviewPayload
  )) {
    (my $new = $n) =~ s/^Cycle/Auspice/;
    $s =~ s/\b\Q$n\E\b/$new/g;
  }

  # 2. camelCase brand identifiers
  my %camel = (
    getCycleBirthInfo                 => 'getAuspiceBirthInfo',
    setCycleBirthInfo                 => 'setAuspiceBirthInfo',
    getCycleBirthDate                 => 'getAuspiceBirthDate',
    clearCycleBirthDate               => 'clearAuspiceBirthDate',
    fetchCycleDay                     => 'fetchAuspiceDay',
    fetchCycleMonth                   => 'fetchAuspiceMonth',
    fetchCycleYearOverview            => 'fetchAuspiceYearOverview',
    fetchCycleSpecialized             => 'fetchAuspiceSpecialized',
    fetchCycleExplain                 => 'fetchAuspiceExplain',
    addCycleNotificationTapListener   => 'addAuspiceNotificationTapListener',
    cyclePalette                      => 'auspicePalette',
    cycleAccentVariants               => 'auspiceAccentVariants',
    cycleRoutes                       => 'auspiceRoutes',
    cycleTimelineRoutes               => 'auspiceTimelineRoutes',
    searchCycleDays                   => 'searchAuspiceDays',
    getCycleProActive                 => 'getAuspiceProActive',
    isCycleProViaRc                   => 'isAuspiceProViaRc',
    transferCyclePeopleToBonds        => 'transferAuspicePeopleToBonds',
  );
  for my $k (keys %camel) {
    my $v = $camel{$k};
    $s =~ s/\b\Q$k\E\b/$v/g;
  }

  # 3. Standalone "Cycle" word (brand mention in i18n / comments).
  # \b safely protects Cycles, Lifecycle, billingCycle.
  $s =~ s/\bCycle\b/Auspice/g;

  # 4. Storage keys: 'cycle.foo' → 'auspice.foo'  (single + double quoted)
  $s =~ s/'cycle\.([\w.-]+)'/'auspice.$1'/g;
  $s =~ s/"cycle\.([\w.-]+)"/"auspice.$1"/g;

  # 5. API routes
  $s =~ s{/api/cycle/}{/api/auspice/}g;
  $s =~ s{/api/cycle\b}{/api/auspice}g;

  # 6. RC entitlement + product IDs (whole-word, won't touch unrelated)
  $s =~ s/\bcycle_pro_monthly\b/auspice_pro_monthly/g;
  $s =~ s/\bcycle_pro_annual\b/auspice_pro_annual/g;
  $s =~ s/\bcycle_pro\b/auspice_pro/g;

  # 7. PORTFOLIO_TARGET_APP value
  $s =~ s/PORTFOLIO_TARGET_APP\s*=\s*'cycle'/PORTFOLIO_TARGET_APP = 'auspice'/g;
  $s =~ s/target_app:\s*'cycle'/target_app: 'auspice'/g;
  $s =~ s/targetApp:\s*'cycle'/targetApp: 'auspice'/g;

  # 8. Workspace pkg name
  $s =~ s{\@zhop/cycle-app}{\@zhop/auspice-app}g;

  # 9. Doc/script path references
  $s =~ s{apps/cycle-app/}{apps/auspice-app/}g;
  $s =~ s{apps/cycle-app\b}{apps/auspice-app}g;

  print $s;
}
