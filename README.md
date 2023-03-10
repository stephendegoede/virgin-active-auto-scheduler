# Virgin Active Auto Scheduler

## Overview

Virgin Active releases a new day's schedule at 20:00 SAST every day. If you forget to book your class on time there may not be any spots left by the time you remember. This little lambda app solves that problem by making a booking for you at 20:05 SAST based on your parameters.

## Prerequisites

To test and deploy the lambda app you need the Serverless CLI installed and an AWS account. If you haven't done this already I highly recommend following the serverless tutorial to familiarise yourself with serverless and AWS:

- https://www.serverless.com/framework/docs/tutorial

## Setup

- Clone this repo to your local machine
- Open the repo in VSCode
- Run `npm install`

## Test

Invoke the lambda function locally with

- `serverless invoke local --function cronHandler `

## Deploy

To deploy the app run

- `serverless deploy`

## TODO

- Add GCalendar support
- Add GMail support
- Refactor
