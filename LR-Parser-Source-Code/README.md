# Parsing / Parsers — Project 7

Interactive compiler-design lab using the supplied pink, cream, yellow, mint and blue palette.

## Run locally

```sh
npm start
```

Open http://localhost:4173. No installation or build is required; Node/npm starts a Python 3 static server. Alternatively, run `python3 -m http.server 4173 --directory dist`. Serve over HTTP rather than double-clicking index.html, because the project uses JavaScript modules.

## Walkthrough

1. Home → Bottom-Up → LR Parsing. Select LR(0), SLR(1), CLR(1), or LALR(1).
2. Select a sample or enter productions. Separate symbols with spaces: `E -> E + T | T`. Use `ε` or `eps` for an empty production. The first left-hand side is the start symbol; `$` is reserved and appended automatically.
3. Build parser reveals only the augmented start item. Next Step exposes one closure addition, goto operation, state, transition, or table entry at a time. Previous Step reconstructs the exact earlier snapshot. Auto-play also advances one event at a time. Run Everything constructs the complete parser and tests the current string immediately; Previous Step still lets you inspect every earlier event.
4. Click a state to inspect its kernel and closure derivation. Pan or zoom the live SVG graph. Focus active state brings the current operation into view. The textbook-style automaton uses compact blue item-set boxes arranged by goto depth, curved labelled arrows, dashed nonterminal transitions and visible self-loops. Distinct ports and return curves separate the arrows.
5. Finish construction, then click Test string. Enter space-separated tokens; leave input empty to test ε. The stack, input pointer, highlighted table cell and action trace advance one action per step.
6. A conflicting cell retains all actions and is visibly marked. The default trace stops at an encountered conflict and rejects the deterministic parse. This does not prove the string lies outside the grammar's language. Explicit shift/reduce policies explore one path, and any acceptance is labelled with the chosen policy. A conflicted grammar may accept a string whose path avoids all conflicting cells.

The floating step bar works beside the graph and table. Arrow-left/right keys step while focus is outside inputs. Home and Bottom-Up remain available at all times. Each variant retains its own grammar, test string, construction position and policy in browser-local storage, including after reload. Entered grammars are processed locally and never sent to a server.

## Included examples and parsers

| Parser | Samples |
| --- | --- |
| LR(0) | Balanced pairs; single sequence; expressions that are not LR(0); ambiguous expressions |
| SLR(1) | Expressions; nullable list; assignment that is CLR but not SLR; ambiguous expressions |
| CLR(1) | Assignment; classic CLR-but-not-LALR grammar; ambiguous expressions |
| LALR(1) | Expressions; assignment; CLR-but-not-LALR merge conflicts; ambiguous expressions |

LALR first builds CLR states, then shows every group with identical LR(0) cores. It unions lookaheads and reconstructs transitions; different cores are never merged. SLR uses FOLLOW for reductions; CLR/LALR use item lookaheads propagated through FIRST(βa).


## Verification

```sh
npm test
```

12 tests cover malformed grammars; nullable FIRST/FOLLOW; closure/goto; known canonical state counts; the distinctions between LR classes; nullable lookahead propagation; LALR merge-induced reduce-reduce conflicts; valid, invalid and empty strings; conflict choices that accept or reject; immutable event snapshots. Browser checks cover incremental construction, accepted and conflicted traces, backward stepping, persisted grammar/navigation and mobile layout.

Teaching-lab limits: 99 original productions, 100 canonical LR states, 1,000 trace actions. Limits are reported without claiming acceptance. 

## Source

- `dist/index.html`: page shell and navigation.
- `dist/style.css`: responsive palette, visual highlights and animation.
- `dist/engine.js`: pure grammar, set, parser-construction and trace algorithms.
- `dist/app.js`: immutable event replay, SVG graph, table controls, trace and persistence.
- `tests/engine.test.js`: executable correctness checks.

All diagrams are live SVG, never static images. Optional Google Fonts have system-font fallbacks. Reduced-motion preferences are respected.
