MODE='TEST' istanbul cover _mocha -- -R spec
open coverage/lcov-report/index.html
