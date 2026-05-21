export const SCOUT_CODE_OF_CONDUCT_PDF_PATH = '/documents/mwos-scout-code-of-conduct.pdf';

export type ScoutCodePrinciple = {
  title: string;
  detail: string;
};

export const scoutCodePrinciples: ScoutCodePrinciple[] = [
  {
    title: 'Integrity and professionalism',
    detail:
      'Represent MWOS fairly, avoid conflicts of interest, disclose personal interests, and never make promises you are not authorised to make.',
  },
  {
    title: 'Safeguarding and approach rules',
    detail:
      'Introduce yourself to club officials, wear valid club ID, and follow the correct procedures before any approach to a player, especially a minor.',
  },
  {
    title: 'Respect, compliance and loyalty',
    detail:
      'Respect match officials, coaches and players, protect club information, follow governing-body rules, and report suspicious behaviour immediately.',
  },
];

export const scoutCodeMusts = [
  'Carry and show your MWOS club identification when scouting.',
  'Be honest and realistic with players, parents and grassroots officials.',
  'Follow safeguarding rules and age-related guardian consent requirements.',
  'Stay aligned with club recruitment protocols and football governing-body rules.',
  'Report suspicious activity or welfare concerns to the club immediately.',
];

export const scoutCodeMustNots = [
  'Do not promise trials, contracts or inducements without club approval.',
  'Do not approach a player contracted to another club outside the proper rules.',
  'Do not pressure children or parents, or abuse your position.',
  'Do not ask parents for money, gifts or any kind of personal benefit.',
  'Do not interfere with matches, instruct players from the touchline, or use offensive or discriminatory language.',
];
