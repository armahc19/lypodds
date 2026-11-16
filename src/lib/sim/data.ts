import type { Team } from "./types";

export interface Fixture {
  league: string;
  venue: string;
  home: Team;
  away: Team;
}

const t = (id: string, name: string, short: string, strength: number): Team => ({
  id,
  name,
  short,
  strength,
});

export const FIXTURES: Fixture[] = [
  { league: "Premier League", venue: "Emirates Stadium", home: t("ars", "Arsenal", "ARS", 86), away: t("che", "Chelsea", "CHE", 80) },
  { league: "La Liga", venue: "Santiago Bernabéu", home: t("rma", "Real Madrid", "RMA", 90), away: t("bar", "Barcelona", "BAR", 87) },
  { league: "Ghana Premier League", venue: "Accra Sports Stadium", home: t("hoa", "Hearts of Oak", "HOA", 70), away: t("kot", "Asante Kotoko", "KOT", 71) },
  { league: "Bundesliga", venue: "Allianz Arena", home: t("bay", "Bayern München", "BAY", 89), away: t("bvb", "Borussia Dortmund", "BVB", 81) },
  { league: "Serie A", venue: "San Siro", home: t("int", "Inter", "INT", 85), away: t("juv", "Juventus", "JUV", 81) },
  { league: "Ligue 1", venue: "Parc des Princes", home: t("psg", "Paris Saint-Germain", "PSG", 86), away: t("om", "Marseille", "MAR", 76) },
  { league: "Premier League", venue: "Anfield", home: t("liv", "Liverpool", "LIV", 87), away: t("mci", "Manchester City", "MCI", 89) },
  { league: "Eredivisie", venue: "Johan Cruyff Arena", home: t("aja", "Ajax", "AJA", 76), away: t("psv", "PSV", "PSV", 78) },
  { league: "Primeira Liga", venue: "Estádio da Luz", home: t("ben", "Benfica", "BEN", 79), away: t("por", "FC Porto", "POR", 78) },
  { league: "La Liga", venue: "Metropolitano", home: t("atm", "Atlético Madrid", "ATM", 82), away: t("sev", "Sevilla", "SEV", 74) },
  { league: "Serie A", venue: "Stadio Maradona", home: t("nap", "Napoli", "NAP", 80), away: t("rom", "Roma", "ROM", 77) },
  { league: "Premier League", venue: "St James' Park", home: t("new", "Newcastle", "NEW", 79), away: t("tot", "Tottenham", "TOT", 78) },
  { league: "Bundesliga", venue: "BayArena", home: t("b04", "Leverkusen", "B04", 83), away: t("rbl", "RB Leipzig", "RBL", 79) },
];

export const BOT_PROFILES: { username: string; country: string }[] = [
  { username: "kofi_trades", country: "GH" },
  { username: "xG_wizard", country: "GB" },
  { username: "pressmachine", country: "DE" },
  { username: "lowblock_lena", country: "NL" },
  { username: "falsenine", country: "ES" },
  { username: "tiki_taka_tom", country: "ES" },
  { username: "gegen_greta", country: "DE" },
  { username: "parkthebus", country: "IT" },
  { username: "volley_vic", country: "NG" },
  { username: "offside_oli", country: "GB" },
  { username: "ama_odds", country: "GH" },
  { username: "catenaccio", country: "IT" },
  { username: "overlap_ola", country: "SE" },
  { username: "nutmeg_nate", country: "US" },
  { username: "trequartista", country: "BR" },
  { username: "rabona_rui", country: "PT" },
  { username: "counterpunch", country: "FR" },
  { username: "inverted_wb", country: "GB" },
  { username: "yaw_scalper", country: "GH" },
  { username: "box_to_box", country: "KE" },
  { username: "panenka_pia", country: "CZ" },
  { username: "set_piece_sam", country: "IE" },
  { username: "libero_lu", country: "AR" },
  { username: "high_line_hu", country: "KR" },
];
