#!/bin/bash
git config user.name "Paper.js Bot"
git config user.email "bot@paperjs.org"
git config credential.helper "store --file=.git/credentials"
echo "https://${GH_TOKEN}:@github.com" > .git/credentials
