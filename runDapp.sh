#!/bin/bash

./node_modules/.bin/truffle migrate --reset
./node_modules/.bin/webpack-cli --mode development 
php -S 0.0.0.0:8000 -t ./build/app


