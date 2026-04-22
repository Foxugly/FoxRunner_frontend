# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository status

As of the initial commit, this repo is **unscaffolded**. It contains only `LICENSE`, a placeholder `README.md` (just the project title), and a generic WebStorm `.idea/` WEB_MODULE config. There is no `package.json`, no source tree, no framework, no build system, no tests, and no lint config yet.

Implication: there are no build/lint/test commands to document, and there is no architecture to summarize. Do not invent any.

## When scaffolding this project

The name (`FoxRunner_frontend`) and the WebStorm WEB_MODULE designation indicate this is intended as a web frontend. Before scaffolding (choosing a framework, bundler, test runner, etc.), confirm the intended stack with the user rather than guessing — the choice is load-bearing and hasn't been made.

Once scaffolding lands, update this file with:
- The actual build / dev / lint / test / single-test commands.
- The "big picture" architecture (routing, state, data flow, module boundaries) — the kind of thing that requires reading multiple files to understand.
