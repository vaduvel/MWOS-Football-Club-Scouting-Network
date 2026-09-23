export const SCOUT_CODE_OF_CONDUCT_PDF_PATH = '/documents/mwos-scout-code-of-conduct.pdf';

export type ScoutCodePrinciple = {
  title: string;
  detail: string;
};

export const scoutCodePrinciples: ScoutCodePrinciple[] = [
  {
    title: 'Role and authority',
    detail:
      'Identify and recommend players for MWOS. Trials, contracts, negotiations and inducements require club management approval.',
  },
  {
    title: 'Professionalism and safeguarding',
    detail:
      'Act fairly and respectfully, protect young players, and complete the club recruitment, safeguarding and scouting training requirements.',
  },
  {
    title: 'Confidentiality and loyalty',
    detail:
      'Protect reports, player databases and club information. Keep your Scouting Hub account private and disclose conflicts of interest promptly.',
  },
];

export const scoutCodeMusts = [
  'Complete club induction, provide police clearance and references, and attend the required safeguarding and scouting workshops.',
  'Wear the MWOS Scout jersey and carry valid club identification when attending in an official capacity.',
  'Introduce yourself to match officials or organizers and communicate honestly with players and parents.',
  'Submit scouting reports on time and cooperate with club supervision and training.',
  'Protect confidential club information and disclose any conflict of interest immediately.',
];

export const scoutCodeMustNots = [
  'Do not negotiate, guarantee trials or contracts, or offer inducements without club management approval.',
  'Do not request money, gifts, favours or personal benefits from players, parents, clubs or officials.',
  'Do not share internal reports, player data or your Scouting Hub account with unauthorized people.',
  'Do not personally profit from club recruitment without written authorization.',
  'Do not abuse your position or behave in a way that damages MWOS or the game.',
];
