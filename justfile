serve port="8787":
    bash scripts/dev-server.sh {{port}}

test: test-deck test-hints test-mnemonics test-phonetic test-tidbit-data test-tidbit-selection

test-deck:
    node scripts/test-deck-refactor.js

test-hints:
    node scripts/test-hint-safety.js

test-mnemonics:
    node scripts/test-mnemonic-curation.js

test-phonetic:
    node scripts/test-phonetic-hint-pipeline.js

test-tidbit-data:
    node scripts/test-tidbit-data.js

test-tidbit-selection:
    node scripts/test-tidbit-selection.js

check: check-coverage audit validate

check-coverage:
    node scripts/check-tidbit-coverage.js

audit mode="all":
    node scripts/audit-mnemonics.js --mode {{mode}}

validate mode="all":
    node scripts/validate-anchor-stories.js --mode {{mode}}

report-unmatched:
    node scripts/report-unmatched-tidbits.js
