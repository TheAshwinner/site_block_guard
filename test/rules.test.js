import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBaseRules,
  allowRule,
  registrableForHost,
  allowIdFor,
  blockedPageUrl,
  RULE_IDS,
  ALLOW_RULE_BASE,
} from '../src/rules.js';
import { config } from '../src/config.js';

const EXT_ID = 'abcdefghabcdefghabcdefghabcdefgh';

function byId(rules, id) {
  return rules.find((r) => r.id === id);
}

test('always-blocked rules are present even when YouTube is inactive', () => {
  const rules = buildBaseRules(config, EXT_ID, false);
  assert.equal(rules.length, 2);
  assert.ok(byId(rules, RULE_IDS.ALWAYS_REDIRECT));
  assert.ok(byId(rules, RULE_IDS.ALWAYS_BLOCK));
  assert.equal(byId(rules, RULE_IDS.YT_REDIRECT), undefined);
});

test('YouTube rules appear only when active', () => {
  const rules = buildBaseRules(config, EXT_ID, true);
  assert.equal(rules.length, 4);
  const ytRedirect = byId(rules, RULE_IDS.YT_REDIRECT);
  const ytBlock = byId(rules, RULE_IDS.YT_BLOCK);
  assert.deepEqual(ytRedirect.condition.requestDomains, config.scheduledDomains);
  assert.deepEqual(ytBlock.condition.requestDomains, config.scheduledDomains);
});

test('main_frame redirects to the PIN page; sub_frame is hard-blocked', () => {
  const rules = buildBaseRules(config, EXT_ID, true);
  const redirect = byId(rules, RULE_IDS.ALWAYS_REDIRECT);
  assert.deepEqual(redirect.condition.resourceTypes, ['main_frame']);
  assert.equal(redirect.action.type, 'redirect');
  assert.ok(redirect.action.redirect.regexSubstitution.startsWith(blockedPageUrl(EXT_ID)));
  assert.ok(redirect.action.redirect.regexSubstitution.includes('#\\1')); // carries original URL

  const block = byId(rules, RULE_IDS.ALWAYS_BLOCK);
  assert.deepEqual(block.condition.resourceTypes, ['sub_frame']);
  assert.equal(block.action.type, 'block');
});

test('allow (unlock) rule outranks base rules and is main_frame-only', () => {
  const base = buildBaseRules(config, EXT_ID, true);
  const allow = allowRule(ALLOW_RULE_BASE, 'linkedin.com');
  assert.equal(allow.action.type, 'allow');
  assert.deepEqual(allow.condition.resourceTypes, ['main_frame']); // embeds stay blocked
  assert.ok(allow.priority > base[0].priority);
});

test('registrableForHost matches domain + subdomains, rejects others', () => {
  const all = [...config.alwaysBlocked, ...config.scheduledDomains];
  assert.equal(registrableForHost('www.linkedin.com', all), 'linkedin.com');
  assert.equal(registrableForHost('linkedin.com', all), 'linkedin.com');
  assert.equal(registrableForHost('m.youtube.com', all), 'youtube.com');
  assert.equal(registrableForHost('notlinkedin.com', all), null);
  assert.equal(registrableForHost('example.com', all), null);
});

test('allowIdFor gives stable, unique ids within the allow range', () => {
  const all = [...config.alwaysBlocked, ...config.scheduledDomains];
  const ids = all.map((d) => allowIdFor(d, all));
  assert.equal(new Set(ids).size, ids.length); // unique
  assert.ok(ids.every((id) => id >= ALLOW_RULE_BASE));
  assert.equal(allowIdFor('linkedin.com', all), allowIdFor('linkedin.com', all)); // stable
  assert.equal(allowIdFor('nope.com', all), null);
});
