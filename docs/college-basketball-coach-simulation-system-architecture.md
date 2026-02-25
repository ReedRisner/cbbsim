# COLLEGE BASKETBALL COACH SIMULATION
## Complete System Architecture & Game Design Document
### Version 1.0 | February 2026

---

> **How to use this document:** This blueprint is divided into **6 development phases**. Each phase is self-contained. You can hand any phase to an AI or developer and say *"Build Phase 1"* and they will have everything they need — schemas, formulas, logic, and system interactions.

---

# PHASE 1: FOUNDATION — Universe, Teams, Players, Database

*Build the data layer. No simulation yet — just the world and its entities.*

---

## 1. Core Game Philosophy

### 1.1 Design Pillars

**Pillar 1: Systemic Realism Over Arcade Fun**
Every outcome emerges from interlocking systems, not scripted events. A recruit choosing your rival isn't random — it's the output of NIL offers, playing time projections, facility ratings, coaching charisma, distance from home, personality traits, and program prestige all feeding into a weighted decision function.

**Pillar 2: Long-Horizon Consequences**
Every decision ripples across 5, 10, or 20+ seasons. Overspending on NIL today creates booster fatigue tomorrow. Neglecting player development in favor of portal shopping erodes your coaching reputation for development-minded recruits.

**Pillar 3: Fog of War and Imperfect Information**
The user never sees a recruit's true overall rating. Scouting reports have confidence intervals. A 4-star recruit may have a hidden potential ceiling of 58 or 88. Transfer portal players may have inflated stats from weak conferences.

**Pillar 4: Emergent Narrative**
A walk-on develops into an All-American. A mid-major raids the portal and makes a Cinderella run. A blue blood collapses under NCAA sanctions. These emerge from systems, not scripts.

### 1.2 Simulation Mode

Hardcore management simulation. No real-time gameplay — all games simulated via possession-by-possession engine. The user's role is strategic: recruiting, roster construction, scheme design, in-game adjustment sliders, and long-term program building.

### 1.3 Data Architecture

Every entity (player, team, coach, conference, recruit) is defined by 30–100+ data points. Random variance uses normal distributions with defined standard deviations, never flat random rolls.

### 1.4 Time Horizon

Designed for 50+ seasons without systemic degradation. Self-correcting mechanisms (prestige decay, booster fatigue, salary cap soft limits, NCAA rule changes) prevent runaway dynasties or permanent mid-major death spirals.

---

## 2. Universe Structure

### 2.1 Teams and Conferences

362 Division I programs organized into 32 conferences (mirroring the real 2024–25 NCAA landscape or a fictional analog). Each conference has 8–18 members.

| Tier | Example Conferences | Teams | Prestige Range | Auto-Bid Value |
|------|-------------------|-------|---------------|----------------|
| Power 4 | SEC, Big Ten, Big 12, ACC | ~68 | 65–99 | 1.0 |
| Upper Mid-Major | AAC, Mountain West, WCC, A-10 | ~56 | 40–70 | 0.7 |
| Mid-Major | MVC, MAC, Sun Belt, CUSA | ~80 | 20–55 | 0.5 |
| Low-Major | MEAC, SWAC, Southland, NEC | ~100+ | 5–35 | 0.3 |

### 2.2 Conference Prestige Formula

Recalculated annually:

```
ConferencePrestige = (0.40 × AvgTeamPrestige)
                   + (0.25 × Top5TeamAvg)
                   + (0.15 × NCAATourneySuccess_3yr)
                   + (0.10 × MediaDealValue)
                   + (0.10 × HistoricalWeight)
```

- `NCAATourneySuccess_3yr` = rolling 3-year weighted sum (current year 50%, year-1 30%, year-2 20%) of tournament wins by conference members, normalized 0–100
- `MediaDealValue` = conference TV contract tier (0–100)
- `HistoricalWeight` = slowly decaying average of all-time conference prestige

### 2.3 Realignment System

Event-driven, evaluated every 3–5 years (randomized):

```
RealignmentTriggerProb = 0.05
  + (0.03 × |ConfPrestigeDelta|)
  + (0.10 × MediaDealExpiring)
  + (0.05 × ProgramDissatisfaction)
```

When triggered, candidate movers are scored:

```
MoveUtility(Team, NewConf) = (0.35 × PrestigeGain)
  + (0.25 × RevenueGain)
  + (0.20 × GeographicFit)
  + (0.10 × RivalryPreservation)
  + (0.10 × CompetitiveFit)
```

Teams move when `MoveUtility > 0.6` and the receiving conference's prestige doesn't drop by more than 5 points. Cascading moves are possible within the same cycle.

**Safety rails:** No conference below 6 members (triggers merger), max 4 moves per cycle, max 20 teams per conference. Orphaned teams are placed into nearest viable conference by geography and prestige.

### 2.4 Blue Blood Classification

Recalculated every 5 years:

| Classification | Criteria | Approx Count |
|---------------|----------|-------------|
| Blue Blood | HistPrestige ≥ 90 AND CurrentPrestige ≥ 75 AND FinalFours ≥ 6 | 6–8 |
| Elite | CurrentPrestige ≥ 80 OR (HistPrestige ≥ 75 AND CurrentPrestige ≥ 65) | 10–15 |
| Upper Tier | CurrentPrestige ≥ 60 | 25–35 |
| Mid Tier | CurrentPrestige 35–59 | 80–120 |
| Lower Tier | CurrentPrestige < 35 | 150+ |

---

## 3. Team Systems

### 3.1 Team Attribute Model

Every team is defined by these core attributes (0–100 unless noted):

| Attribute | Description | Update Frequency |
|-----------|-------------|-----------------|
| CurrentPrestige | Recent (3–5 yr) on-court success, recruiting, media visibility | Annual |
| HistoricalPrestige | All-time legacy; decays 0.5/yr toward CurrentPrestige | Annual |
| FacilityRating | Arena, practice facility, weight room, dorms | On investment |
| NILCollectiveStrength | Financial power of the team's NIL collective | Annual |
| BoosterBudget | Annual discretionary booster funds (in $100K units, range 0–500) | Annual |
| RecruitingRegions | 1–4 geographic pipeline regions with affinity scores | Static + coach |
| FanBaseIntensity | How engaged/demanding the fanbase is | Annual |
| MediaMarket | Size of media market (affects NIL, revenue, visibility) | Static |
| ArenaCapacity | Seating capacity; affects revenue and home court advantage | On investment |
| AcademicRating | Affects eligibility rates, appeals to academic-minded recruits | Static |

### 3.2 Prestige Growth Formula

```
PrestigeDelta = (0.35 × WinImpact)
              + (0.25 × TourneyImpact)
              + (0.15 × RecruitingClassRank)
              + (0.10 × NBADraftPicks)
              + (0.08 × MediaBuzz)
              + (0.07 × FacilityBonus)
              - Sanctions
```

- `WinImpact = (ActualWins - ExpectedWins) × 1.5`, capped at ±8
- `TourneyImpact`: R64 exit = +0.5, R32 = +1.5, S16 = +3, E8 = +5, F4 = +8, Championship Game = +11, Title = +15. Missing tournament when expected = -3 to -6
- `RecruitingClassRank`: #1 class = +5, #100 class = -2 (normalized)

### 3.3 Prestige Decay

```
DecayRate = BaseDecay × (1 + 0.15 × ConsecutiveUnderperformYears)
BaseDecay = max(0, (ExpectedWins - ActualWins) × 0.8)
```

Example: Team expected 22 wins, gets 14 → loses (22-14)×0.8 = 6.4 prestige in Year 1. Year 2 underperformance → 6.4 × 1.15 = 7.36.

Historical prestige decays at 0.5 points/year toward 10-year rolling average of CurrentPrestige.

### 3.4 Facility Investment

Non-linear cost scaling:

```
UpgradeCost(current, target) = SUM from r=current to target of: BaseCost × (1.04^r)
BaseCost = $200K per point at rating 0
```

- 50→55 costs ~$7.4M
- 90→95 costs ~$38M
- Facilities degrade -1 point every 3 years without maintenance

### 3.5 Fan Interest Model

```
FanInterest = (0.30 × CurrentPrestige)
            + (0.25 × RecentWinPct_3yr)
            + (0.20 × FanBaseIntensity)
            + (0.15 × StarPlayerPresence)
            + (0.10 × RivalryIntensity)
```

- Above 75 → +3 home court advantage bonus
- Below 30 → booster donations decline 20%
- Below 20 → arena attendance drops to 60%, reducing game-day revenue

### 3.6 Budget Calculation

```
AnnualRevenue = (ConfRevShare × MediaDealTier)
              + (GameDayRevenue × ArenaCapacity × AttendancePct)
              + (BoosterDonations × FanInterest/100)
              + (MerchRevenue × CurrentPrestige/100)
              + (NCAATourneyPayout × TourneyRoundsWon)
```

---

## 4. Player Archetype System

### 4.1 Physical Attributes (6)

| Attribute | Description | Mutability |
|-----------|-------------|-----------|
| Height | In inches (72–87 typical) | Static after age 19 |
| Wingspan | In inches; affects blocks, steals, rebounding | Static |
| Weight | In pounds; affects post play, physicality | Training (±5 lbs/yr max) |
| Speed | Straight-line quickness | Age curve, training |
| Vertical | Leaping ability | Age curve, training |
| Stamina | Endurance before fatigue penalties | Training, age |

### 4.2 Skill Attributes (18)

All rated 0–99:

| Attribute | Category | Description |
|-----------|----------|-------------|
| CloseShot | Offense | Finishing at rim, layups, floaters |
| MidRange | Offense | Pull-up and catch-and-shoot mid-range |
| ThreePoint | Offense | Spot-up, off-dribble, deep three |
| FreeThrow | Offense | Free throw accuracy |
| PostMoves | Offense | Back-to-basket moves, hooks, fades |
| BallHandling | Offense | Dribble moves, turnover avoidance |
| Passing | Offense | Vision, accuracy, pocket passes |
| OffRebounding | Hustle | Offensive glass positioning and effort |
| DefRebounding | Defense | Defensive board positioning, boxing out |
| InteriorDef | Defense | Shot blocking, rim protection, post D |
| PerimeterDef | Defense | On-ball defense, lateral quickness |
| StealAbility | Defense | Active hands, passing lane reads |
| ShotIQ | Mental | Shot selection, when to shoot vs pass |
| DefIQ | Mental | Rotations, help defense, positioning |
| ScreenSetting | Offense | Pick quality, roll timing |
| OffBallMovement | Offense | Cutting, spacing, relocating |
| TransitionPlay | Offense | Fast break effectiveness |
| DrawFouls | Offense | Ability to get to the foul line |

### 4.3 Tendencies (8)

Tendencies describe HOW a player plays, not how good they are. Rated 0–99:

| Tendency | Low (0–30) | High (70–99) |
|----------|-----------|-------------|
| AggressionOffense | Conservative, low usage | Ball-dominant, high usage |
| AggressionDefense | Stays home, positional | Gambles for steals/blocks |
| ThreePointFrequency | Rarely shoots threes | High-volume three shooter |
| PostUpFrequency | Faces up / perimeter | Frequently posts up |
| TransitionPush | Slows it down | Always pushes tempo |
| PassFirst | Looks to score first | Pass-first mentality |
| FlashyPlay | Fundamental | Flashy but higher TO risk |
| FoulProne | Disciplined | Commits fouls frequently |

### 4.4 Personality Traits (7)

| Trait | Range | Impact |
|-------|-------|--------|
| WorkEthic | 0–99 | Development speed multiplier: 0.7x (low) to 1.4x (high) |
| Loyalty | 0–99 | Portal entry probability, decommit chance, coach attachment |
| Ego | 0–99 | Playing time demands, NIL expectations, chemistry impact |
| Coachability | 0–99 | Scheme fit speed, adjustment to new playstyle |
| Competitiveness | 0–99 | Clutch multiplier, practice intensity, rivalry boosts |
| Leadership | 0–99 | Team morale buffer, locker room influence |
| Maturity | 0–99 | Off-court incident risk, academic focus, media handling |

### 4.5 Hidden/Special Attributes (6)

| Attribute | Visibility | Description |
|-----------|-----------|-------------|
| TruePotential | Hidden | Ceiling rating (40–99); determines max development |
| PotentialVariance | Hidden | How uncertain the ceiling is (low = reliable, high = boom/bust) |
| InjuryProneness | Partially Hidden | Base injury probability per game (0.5%–5%) |
| ClutchRating | Hidden until proven | Performance modifier in final 5 min of close games |
| Consistency | Partially Hidden | Game-to-game variance (low = volatile) |
| NBADraftInterest | Dynamic | Likelihood of declaring; recalculated each March |

### 4.6 Potential and Development

```
SeasonDevPoints = BaseDev × WorkEthicMult × CoachDevSkill × PlayingTimeMult × AgeFactor × FitBonus
```

Where:

```
BaseDev = (TruePotential - CurrentOverall) × 0.12   [if gap > 10]
BaseDev = (TruePotential - CurrentOverall) × 0.06   [if gap 1–10]
BaseDev = 0                                          [if at or above TruePotential]
```

Multipliers:
- `WorkEthicMult`: 0.7 (WorkEthic < 20) to 1.4 (WorkEthic > 90)
- `CoachDevSkill`: coach's Development attribute / 100, range 0.6–1.2
- `PlayingTimeMult`: min(1.0, MinutesPerGame / 25)
- `AgeFactor`: peaks at age 19–20 (1.1x), drops to 0.8x at age 23+
- `FitBonus`: +0.1 if player archetype matches coach playstyle

### 4.7 Development Curves

Assigned at generation, hidden from user:

| Curve Type | Probability | Peak Age | Pattern |
|-----------|------------|---------|---------|
| Early Bloomer | 15% | 19–20 | Fast growth, plateaus early, earlier regression |
| Standard | 45% | 21–22 | Steady linear improvement through Jr/Sr year |
| Late Bloomer | 20% | 22–24 | Slow start, significant jumps in Year 3–4 |
| Bust | 12% | N/A | TruePotential overestimated by 10–25 points |
| Freak Leap | 8% | Varies | One season of massive improvement (+12–18 pts) |

### 4.8 Regression

```
RegressionRate = BaseRegression × (Age - PeakAge) × PositionFactor
BaseRegression = 1.5 pts/yr for physical attributes, 0.5 pts/yr for skill attributes
```

Guards peak at 21–22, bigs at 22–23. Primarily affects 5th-year seniors and grad transfers.

### 4.9 Overall Rating Calculation

```
Overall = SUM(Attribute_i × PositionWeight_i) / SUM(PositionWeight_i)
```

Position-weighted: A PG weights BallHandling (1.5x), Passing (1.3x), PerimeterDef (1.2x), Speed (1.2x) heavily, PostMoves (0.2x) low. A center inverts these. A 75-overall PG and 75-overall C have very different profiles but equivalent positional value.

---

## 5. Database Structure

### 5.1 Players Table

```sql
players (
  id BIGINT PRIMARY KEY,
  first_name VARCHAR, last_name VARCHAR,
  team_id BIGINT REFERENCES teams(id),
  position ENUM('PG','SG','SF','PF','C'),
  class_year ENUM('FR','SO','JR','SR','GR'),
  age INT, height INT, weight INT, wingspan INT,
  hometown_state VARCHAR, hometown_city VARCHAR,
  hs_star_rating INT,

  -- Skill attributes (18)
  close_shot INT, mid_range INT, three_point INT, free_throw INT,
  post_moves INT, ball_handling INT, passing INT,
  off_rebounding INT, def_rebounding INT,
  interior_def INT, perimeter_def INT, steal_ability INT,
  shot_iq INT, def_iq INT, screen_setting INT,
  off_ball_movement INT, transition_play INT, draw_fouls INT,

  -- Physical (4 mutable)
  speed INT, vertical INT, stamina INT, weight INT,

  -- Tendencies (8)
  aggression_offense INT, aggression_defense INT,
  three_point_frequency INT, post_up_frequency INT,
  transition_push INT, pass_first INT,
  flashy_play INT, foul_prone INT,

  -- Personality (7)
  work_ethic INT, loyalty INT, ego INT, coachability INT,
  competitiveness INT, leadership INT, maturity INT,

  -- Hidden (6)
  true_potential INT, potential_variance INT,
  injury_proneness FLOAT, clutch_rating INT,
  consistency INT, nba_draft_interest INT,

  -- Status
  overall_rating INT, nil_value FLOAT, nil_contract_id BIGINT,
  injury_status VARCHAR, injury_games_remaining INT,
  academic_gpa FLOAT, eligibility_years_remaining INT,
  redshirt_used BOOLEAN, portal_status ENUM('none','entered','committed'),
  draft_declaration BOOLEAN, dev_curve_type ENUM('early','standard','late','bust','freak'),
  created_season INT, retired_season INT
);
```

### 5.2 Teams Table

```sql
teams (
  id BIGINT PRIMARY KEY,
  name VARCHAR, mascot VARCHAR,
  conference_id BIGINT REFERENCES conferences(id),
  prestige_current INT, prestige_historical INT,
  facility_rating INT, nil_collective_strength INT,
  booster_budget INT, media_market INT,
  fan_intensity INT, arena_capacity INT,
  academic_rating INT, head_coach_id BIGINT REFERENCES coaches(id),
  primary_color VARCHAR, secondary_color VARCHAR,
  rivalry_1_team_id BIGINT, rivalry_1_intensity INT,
  rivalry_2_team_id BIGINT, rivalry_2_intensity INT,
  rivalry_3_team_id BIGINT, rivalry_3_intensity INT
);
```

### 5.3 Conferences Table

```sql
conferences (
  id BIGINT PRIMARY KEY,
  name VARCHAR, prestige INT,
  media_deal_value INT, tournament_format VARCHAR,
  auto_bid_value FLOAT, member_count INT,
  tier ENUM('power4','upper_mid','mid','low'),
  founded_season INT, dissolved_season INT
);
```

### 5.4 Coaches Table

```sql
coaches (
  id BIGINT PRIMARY KEY,
  first_name VARCHAR, last_name VARCHAR,
  team_id BIGINT REFERENCES teams(id),
  role ENUM('head','assistant_oc','assistant_dc','assistant_recruiting','assistant_dev'),
  age INT,

  -- Attributes (11)
  offensive_iq INT, defensive_iq INT, development_skill INT,
  recruiting_skill INT, charisma INT, discipline INT,
  game_management INT, adaptability INT,
  loyalty INT, ambition INT, ethics INT,

  -- Contract
  salary FLOAT, contract_years_remaining INT,

  -- Record
  career_wins INT, career_losses INT,
  tournament_appearances INT, final_fours INT, championships INT,

  -- Scheme
  scheme_pace INT, scheme_three_emphasis INT, scheme_post_usage INT,
  scheme_press_frequency INT, scheme_zone_vs_man INT,
  scheme_pnr INT, scheme_transition INT, scheme_def_aggression INT,

  -- Lineage
  coaching_tree_parent_id BIGINT REFERENCES coaches(id),
  nba_interest INT
);
```

### 5.5 Game Logs Table

```sql
game_logs (
  id BIGINT PRIMARY KEY,
  season INT, week INT,
  home_team_id BIGINT, away_team_id BIGINT,
  home_score INT, away_score INT,
  home_off_eff FLOAT, away_off_eff FLOAT,
  home_def_eff FLOAT, away_def_eff FLOAT,
  pace INT, overtime_periods INT,
  attendance INT,
  is_conference BOOLEAN, is_tournament BOOLEAN,
  is_ncaa_tournament BOOLEAN, neutral_site BOOLEAN
);

player_game_stats (
  id BIGINT PRIMARY KEY,
  game_id BIGINT REFERENCES game_logs(id),
  player_id BIGINT REFERENCES players(id),
  minutes INT, points INT, fgm INT, fga INT,
  three_pm INT, three_pa INT, ftm INT, fta INT,
  off_reb INT, def_reb INT, assists INT,
  steals INT, blocks INT, turnovers INT,
  fouls INT, plus_minus INT
);
```

### 5.6 Additional Tables

```sql
recruits (
  id BIGINT PRIMARY KEY,
  first_name VARCHAR, last_name VARCHAR,
  position VARCHAR, star_rating INT, composite_score FLOAT,
  hometown_state VARCHAR, hometown_city VARCHAR,
  scouted_overall INT, scouted_potential INT,
  true_overall INT, true_potential INT,
  committed_team_id BIGINT, committed_date INT,
  -- All personality/physical attributes same as players
  recruit_class_year INT
);

nil_contracts (
  id BIGINT PRIMARY KEY,
  player_id BIGINT, team_id BIGINT,
  annual_value FLOAT, contract_years INT,
  start_season INT, end_season INT, status VARCHAR
);

transfers (
  id BIGINT PRIMARY KEY,
  player_id BIGINT, from_team_id BIGINT, to_team_id BIGINT,
  season INT, reason VARCHAR, portal_entry_date INT,
  commitment_date INT, immediate_eligible BOOLEAN
);

awards (
  id BIGINT PRIMARY KEY,
  season INT, award_type VARCHAR,
  player_id BIGINT, team_id BIGINT, coach_id BIGINT
);

rankings_history (
  id BIGINT PRIMARY KEY,
  season INT, week INT, poll_type VARCHAR,
  team_id BIGINT, rank INT, points INT
);

season_records (
  id BIGINT PRIMARY KEY,
  season INT, team_id BIGINT,
  wins INT, losses INT, conf_wins INT, conf_losses INT,
  adj_off_eff FLOAT, adj_def_eff FLOAT, net_rating FLOAT,
  sos FLOAT, ncaa_seed INT, ncaa_result VARCHAR,
  recruiting_class_rank INT
);

coaching_changes (
  id BIGINT PRIMARY KEY,
  season INT, team_id BIGINT,
  old_coach_id BIGINT, new_coach_id BIGINT,
  reason VARCHAR, buyout_amount FLOAT
);

conference_membership_history (
  id BIGINT PRIMARY KEY,
  team_id BIGINT, conference_id BIGINT,
  start_season INT, end_season INT
);

sanctions (
  id BIGINT PRIMARY KEY,
  team_id BIGINT, season_imposed INT,
  severity VARCHAR, scholarship_reduction INT,
  postseason_ban_years INT, recruiting_penalty VARCHAR,
  prestige_hit INT, duration_years INT
);

draft_history (
  id BIGINT PRIMARY KEY,
  season INT, player_id BIGINT,
  round INT, pick INT, declared_early BOOLEAN
);

schedule (
  id BIGINT PRIMARY KEY,
  season INT, week INT,
  home_team_id BIGINT, away_team_id BIGINT,
  neutral_site BOOLEAN, tournament_name VARCHAR,
  is_rivalry BOOLEAN
);
```

---

### Phase 1 Deliverable Checklist

- [ ] All database tables created and seeded
- [ ] 362 teams generated with full attributes
- [ ] 32 conferences with prestige scores and media deals
- [ ] Initial roster generation: ~4,500 players with all 50+ attributes
- [ ] ~500 recruits generated for Year 1 class
- [ ] Coaching staff (head + 4 assistants) for all 362 teams
- [ ] Conference prestige formula functional
- [ ] Blue blood classification logic functional
- [ ] Prestige growth/decay formulas functional
- [ ] Fan interest model functional
- [ ] Facility investment cost curve functional
- [ ] Player overall rating calculator functional (position-weighted)
- [ ] Development curve assignment at player generation

---

# PHASE 2: RECRUITING, PORTAL, AND NIL

*Build the player acquisition and economic systems.*

---

## 6. Recruiting System

### 6.1 Recruit Generation

Each year generate:
- **450–550 high school recruits** distributed geographically (weighted toward Eastern seaboard, Texas, California, Illinois, Indiana, Georgia)
- **100–150 JUCO transfers** (2-year college players, typically more physically mature, lower academic ratings, immediately eligible, 2 years of eligibility remaining)
- **20–40 international prospects** (higher scouting uncertainty ×1.5, potential visa complications with 5% chance of delay, unique physical tools)

### 6.2 Star Rating Formula

```
ScoutedOverall = TrueOverall + NormalRandom(0, ScoutingUncertainty)
ScoutedPotential = TruePotential + NormalRandom(0, ScoutingUncertainty × 1.5)
CompositeScore = (0.40 × ScoutedPotential) + (0.35 × ScoutedOverall) + (0.15 × Measurables) + (0.10 × EventPerformance)
```

| Star Rating | Composite Range | Count/Year | Avg True Potential |
|------------|----------------|-----------|-------------------|
| 5-Star | 92–99 | 25–35 | 82–95 |
| 4-Star | 80–91 | 100–130 | 70–88 |
| 3-Star | 65–79 | 200–250 | 55–78 |
| 2-Star | 50–64 | 100–150 | 42–65 |
| Unranked | <50 | Unlimited (walk-ons) | 30–55 |

Note overlapping True Potential ranges — a 3-star with potential 78 can outperform many 4-stars. This is by design.

### 6.3 Scouting Fog of War

```
ScoutingUncertainty = BaseUncertainty × (1 - ScoutingInvestment) × PositionFactor × GeographyFactor
```

- `BaseUncertainty` = 15 for all recruits
- `ScoutingInvestment` = 0–1 based on effort (visits, film study, camp evaluations)
- `PositionFactor` = 1.0 guards, 1.2 wings, 1.4 bigs
- `GeographyFactor` = 1.0 domestic, 1.5 international

Zero scouting: displayed range = "65–85 potential" (±10). Max scouting: "73–79 potential" (±3). Uncertainty never reaches zero.

### 6.4 Recruit Interest Calculation

Each recruit maintains Interest (0–100) for every recruiting school, updated weekly:

```
InterestDelta = (PrestigeWeight × PrestigeFactor)
              + (ProximityWeight × DistanceFactor)
              + (PlayingTimeWeight × PTProjection)
              + (NILWeight × NILOffer)
              + (CoachWeight × CoachCharisma)
              + (StyleWeight × PlaystyleFit)
              + (DevWeight × CoachDevReputation)
              + (WinWeight × RecentSuccess)
              + (RelationshipWeight × RecruitingEffort)
              + (ProDevWeight × NBATrackRecord)
```

**Weight personalization by personality:**
- High-Ego recruit → weights NIL and Prestige heavily
- High-Loyalty recruit → weights Proximity and Relationship
- Pro-focused recruit → weights DevReputation and NBATrackRecord
- Academic recruit → weights AcademicRating

### 6.5 Pro Development Pitch

```
NBATrackRecord = (DraftPicksLast5yr × 3) + (LotteryPicksLast5yr × 5) + (CoachDevReputation × 0.2)
```

Displayed to recruits as a "Pro Development Grade" (A+ through D). Recruits with high NBADraftInterest weight this at 2–3× normal.

### 6.6 Visit System

Up to 5 official visits and unlimited unofficial visits per recruit:

```
OfficialVisitBoost = 5 + (FacilityRating / 20) + (FanInterest / 25) + (CoachCharisma / 30)
UnofficialVisitBoost = OfficialVisitBoost × 0.4
```

Example: Facilities 90, FanInterest 80, Charisma 85 → 5 + 4.5 + 3.2 + 2.8 = **+15.5 interest**

Late visits (after January) get 1.3× multiplier due to urgency.

### 6.7 Commitment Logic

```
CommitProbability = sigmoid((TopInterest - 80) / 5) × sigmoid((TopInterest - SecondInterest - 15) / 5)
```

- Commit when top school Interest > 80 AND leads 2nd place by ≥ 15
- If no school meets threshold by signing day → commits to highest above 60
- Below 60 → recruit goes to random school in their tier range

### 6.8 Decommitment and Flips

```
DecommitProb = BaseDecommit × (1 - Loyalty/100) × TriggerMultiplier
BaseDecommit = 0.03 per week (3%)
```

Trigger multipliers:
- Coach fired = 5×
- Program sanctions = 4×
- Better NIL offer = 2×
- Key player transfer = 1.5×

Example: Low-loyalty (20) recruit + coaching change → 0.03 × 0.8 × 5 = **12%/week** (likely to flip). High-loyalty (90) + same → 0.03 × 0.1 × 5 = **1.5%/week**.

### 6.9 JUCO-Specific Mechanics

- JUCO players have known ratings (no fog of war on skills, but personality traits still uncertain ±10)
- Immediately eligible, 2 years of eligibility
- Typically higher physical attributes, lower academic GPA (2.0–2.8 range)
- Appeal to programs needing instant roster help
- Higher transfer-out risk (Loyalty typically 20–50)

### 6.10 International-Specific Mechanics

- Scouting uncertainty × 1.5 on all attributes
- 5% chance of visa delay (miss first 2–4 weeks of season)
- Often unique physical profiles (height/wingspan outliers)
- Lower social media following (NIL value reduced 30%)
- Cultural adjustment period: -5 to all attributes for first semester, recovering over Year 1

---

## 7. Transfer Portal System

### 7.1 Portal Entry Logic

After each season, every player evaluates portal entry:

```
PortalEntryProb = BaseRate + PTFrustration + NILGap + CoachChangePush
               + SanctionsPush + PersonalityFactor - LoyaltyAnchor
```

Components:
```
BaseRate = 0.05 (5% consider transferring regardless)
PTFrustration = max(0, (ExpectedMinutes - ActualMinutes) / ExpectedMinutes × 0.30)
NILGap = max(0, (MarketValueNIL - CurrentNIL) / MarketValueNIL × 0.15)
CoachChangePush = 0.25 if head coach fired/left, 0.10 if key assistant left
SanctionsPush = 0.20 if program under sanctions
PersonalityFactor = (Ego / 100) × 0.10 - (Maturity / 100) × 0.05
LoyaltyAnchor = (Loyalty / 100) × 0.20
```

Example: 30% PT frustration, high ego (80), medium loyalty (50), coaching change → 0.05 + 0.30 + 0 + 0.25 + 0 + 0.08 - 0.10 = **58% portal entry probability**

### 7.2 Portal Market Dynamics

```
PortalPlayerValue = CurrentOverall - ContextDiscount + SystemBonus
ContextDiscount = max(0, (OldTeamSOS - 50) × -0.3)  [penalizes stats vs weak opponents]
SystemBonus = FitScore(Player, NewCoachPlaystyle) × 3
```

### 7.3 Immediate Eligibility

- First-time transfers: immediate eligibility (default)
- Second-time transfers: sit-out one year (toggleable rule)
- Dynamic rule system can modify these rules over time

### 7.4 Tampering

```
TamperRisk = (CoachEthics < 40) × 0.15 + (NILCollective > 80) × 0.10 + (PlayerValue > 85) × 0.10
```

5% random audit chance per flagged interaction. Penalty if caught: recruiting restriction for 1 season.

### 7.5 Mid-Season Portal Window

A secondary portal window opens in December (10-day window). Only applies to players with:
- PTFrustration > 0.50
- OR CoachChange during season
- Only 10–15% of annual portal volume occurs mid-season

---

## 8. NIL System

### 8.1 Collective Funding Formula

```
AnnualNILBudget = BoosterBase × MediaMarketMult × PrestigeMult × FanInterestMult × (1 + DonorMomentum)
```

Where:
```
BoosterBase = BoosterBudget × $100K
MediaMarketMult = 0.6 + (MediaMarket / 100) × 0.8       [range 0.6–1.4]
PrestigeMult = 0.5 + (CurrentPrestige / 100) × 1.0       [range 0.5–1.5]
FanInterestMult = 0.7 + (FanInterest / 100) × 0.6        [range 0.7–1.3]
DonorMomentum = +0.15 if tournament, +0.25 if S16+, -0.10 if missed
```

Example blue blood: Budget 400, Media 90, Prestige 92, Fan 85, Final Four → ~$113M
Example low-major: Budget 15, Media 20, Prestige 18, Fan 30 → ~$533K
**200:1 ratio mirrors real-world disparities.**

### 8.2 Player NIL Value

```
PlayerNILValue = (PerformanceScore × 0.40) + (SocialMediaRating × 0.25) + (MarketAppeal × 0.20) + (TeamPrestige × 0.15)
```

### 8.3 Social Media Growth

```
SocialMediaDelta = BaseGrowth + PerformanceBoost + ViralEventBoost + MarketMultiplier
BaseGrowth = +1 per season
PerformanceBoost = (PER - 15) × 0.5  [above average players grow faster]
ViralEventBoost = +5 to +15 (rare event, 3% chance per season per player)
MarketMultiplier = MediaMarket / 50  [big market = 2× growth]
```

### 8.4 NIL Contract Mechanics

- **Contract length:** 1–4 years
- **Renegotiation triggers:** Player performance changes ±15%, team changes, market shifts
- **Early termination:** Player enters portal → contract void. Player drafted → contract void.
- **Signing bonus:** Up to 20% of annual value, paid upfront (non-recoverable)

### 8.5 Booster Fatigue

```
BoosterFatigue = max(0, (CumulativeSpending_3yr / BoosterCapacity) - 1.0) × 0.20
```

Overspending 3 consecutive years → budget cut up to 20%. Self-corrects NIL arms races.

### 8.6 NIL Jealousy

```
JealousyFactor = max(0, (TeammateTopNIL - PlayerNIL) / TeammateTopNIL - ExpectedGap) × (Ego / 100)
```

High-ego underpaid players: morale penalty up to -8% performance, portal entry probability +15%.

### 8.7 NIL Soft Cap

No player can receive more than 25% of collective budget. Diminishing returns on NIL spending in recruiting:

```
NILRecruitingImpact = log(NILOffer / MedianNILAtTier + 1) × 15  [logarithmic, not linear]
```

After ~3× median offer, additional money has minimal marginal effect.

---

### Phase 2 Deliverable Checklist

- [ ] Recruit generation pipeline (HS + JUCO + International)
- [ ] Star rating and composite score calculator
- [ ] Scouting fog of war system
- [ ] Interest calculation engine with personality-weighted factors
- [ ] Visit system with boost calculations
- [ ] Commitment and decommitment logic
- [ ] Pro development pitch tracking and display
- [ ] Transfer portal entry probability calculator
- [ ] Portal marketplace with value adjustments
- [ ] Tampering detection system
- [ ] NIL collective funding formula
- [ ] Player NIL valuation
- [ ] Social media growth model
- [ ] NIL contract creation, renegotiation, termination
- [ ] Booster fatigue and jealousy systems
- [ ] NIL soft cap and diminishing returns
- [ ] JUCO and international-specific mechanics

---

# PHASE 3: COACHING, PLAYSTYLE, AND GAME SIMULATION

*Build the coaching model and the engine that plays the games.*

---

## 9. Coaching System

### 9.1 Coach Attribute Model

| Attribute | Range | Primary Effect |
|-----------|-------|---------------|
| OffensiveIQ | 0–99 | Offensive efficiency in sim, scheme quality |
| DefensiveIQ | 0–99 | Defensive efficiency in sim, scheme quality |
| DevelopmentSkill | 0–99 | Player growth multiplier (0.6x–1.2x) |
| RecruitingSkill | 0–99 | Interest generation rate, scouting accuracy |
| Charisma | 0–99 | Visit boosts, media handling, decommit resistance |
| Discipline | 0–99 | Fewer off-court incidents, better academic performance |
| GameManagement | 0–99 | Timeout usage, rotation, end-game decisions |
| Adaptability | 0–99 | In-game adjustment speed, scheme flexibility |
| Loyalty | 0–99 | Resistance to job-hopping |
| Ambition | 0–99 | Job-seeking behavior, NBA interest |
| Ethics | 0–99 | Rule compliance, tampering avoidance |

### 9.2 Assistant Coaches (4 per staff)

| Role | Primary Contribution |
|------|---------------------|
| Offensive Coordinator | +0 to +8 bonus to team OffensiveIQ based on their own OffIQ |
| Defensive Coordinator | +0 to +8 bonus to team DefensiveIQ based on their own DefIQ |
| Recruiting Coordinator | +0 to +10 bonus to recruiting reach, extra scouting capacity |
| Player Development Coach | +0 to +8 bonus to DevelopmentSkill, specializes in 1–2 positions |

Assistants are poachable — successful assistant coaches get hired as head coaches elsewhere, weakening your staff.

### 9.3 Coaching Tree

Each coach links to a mentor. Shared tree → similar schemes, pipeline recruiting connections, more likely to hire each other as assistants. When a HC is fired, their assistants scatter, carrying institutional knowledge and recruit relationships.

### 9.4 Firing Logic

```
HotSeatScore = (ExpectedWins - ActualWins) × 2
             + TourneyDisappointment × 3
             + ScandalPenalty + FanPressure

FiringProbability = sigmoid((HotSeatScore - FiringThreshold) / 3)
```

- Blue blood FiringThreshold = 8 (low tolerance)
- Mid-major FiringThreshold = 15 (higher tolerance)

Example: HotSeatScore 12 at blue blood → sigmoid((12-8)/3) = **79% fired**. Same at mid-major → sigmoid((12-15)/3) = **27%**.

### 9.5 Hiring Logic

```
HireScore = (0.25 × WinRecord) + (0.20 × RecruitingSkill) + (0.15 × Charisma)
          + (0.15 × SchemeFit) + (0.10 × Loyalty) + (0.10 × PrestigeMatch) + (0.05 × Cost)
```

Blue bloods prioritize WinRecord and Charisma. Mid-majors prioritize Cost and RecruitingSkill.

### 9.6 Buyout Formula

```
Buyout = AnnualSalary × RemainingYears × 0.70
```

A coach at $4M/yr with 5 years left costs $14M to fire, reducing BoosterBudget for 2–3 years.

### 9.7 Coach Development

Coaches improve over time:
```
CoachDevRate = (Experience × 0.3) + (WinPct × 0.3) + (TourneySuccess × 0.2) + (MentorQuality × 0.2)
```
Young coaches (age < 40) gain +1–2 to a random attribute per year. Veteran coaches (55+) begin regressing at -0.5/yr.

---

## 10. Playstyle System

### 10.1 Scheme Sliders (0–100)

| Slider | Low (0–30) | High (70–100) | Sim Effect |
|--------|-----------|--------------|-----------|
| Pace | Slow, half-court | Fast, up-tempo | Possessions/game: 60–78 |
| ThreePointEmphasis | Paint-focused | Perimeter-heavy | 3PA rate: 20%–50% |
| PostUsage | No post play | Feed the post | Post possessions: 5%–35% |
| PressFrequency | No press | Full-court press | TO forcing +/– fatigue cost |
| ZoneVsMan | All man-to-man | All zone | Rebounding vs 3PT defense tradeoff |
| PickAndRoll | Isolation/motion | PnR heavy | PnR possessions: 10%–45% |
| TransitionPush | Always set up | Run and gun | Fast break rate: 10%–30% |
| DefensiveAggression | Pack the paint | Extend and deny | Steal rate vs open 3 rate |

### 10.2 Playstyle-Player Fit

```
FitScore = 100 - SUM(|PlayerTendency_i - SchemeRequirement_i| × Weight_i) / N
```

- FitScore < 50 → -5% performance penalty
- FitScore > 80 → +3% performance bonus
- FitScore affects morale: mismatched players lose 2 morale/week

### 10.3 Playstyle Impact on Recruiting

Recruits evaluate playstyle fit. A ball-dominant guard prefers high Pace, low PostUsage. Strategic tension: changing scheme to fit a star recruit may alienate existing players.

---

## 11. Game Simulation Engine

### 11.1 Architecture

Possession-by-possession model. Each game simulates 130–160 possessions (65–80 per team) depending on pace.

### 11.2 Possession Flow

1. **Determine possession type** — transition or half-court (based on TransitionPush and turnover context)
2. **Select primary action** — PnR, post-up, isolation, motion, cut (scheme weights + personnel)
3. **Determine participants** — ball-handler and action targets (usage tendencies + lineup)
4. **Calculate shot quality**
5. **Determine outcome** — made shot, missed shot, turnover, foul
6. **If missed → resolve rebound**
7. **Update fatigue, fouls, stats**

### 11.3 Shot Quality Formula

```
ShotQuality = BaseSkill + SpacingBonus + SchemeBonus - DefenseRating - FatiguePenalty + Randomness

BaseSkill = ShooterRelevantAttribute  [CloseShot / MidRange / ThreePoint]
SpacingBonus = (TeamSpacingIndex - 50) × 0.15  [5 shooters = +7.5, none = -7.5]
SchemeBonus = FitScore × 0.05  [max +5]
DefenseRating = ClosestDefenderAttribute × ContestFactor
FatiguePenalty = max(0, (MinutesPlayed - 30) × 0.8)
Randomness = NormalRandom(0, 8)
```

### 11.4 Shooting Probability

```
MakeProbability = BasePct × (1 + (ShotQuality - 50) × 0.008)
```

| Shot Type | BasePct | ShotQuality 80 | ShotQuality 30 |
|-----------|---------|----------------|----------------|
| Close | 58% | 71.9% | 48.7% |
| MidRange | 40% | 49.6% | 33.6% |
| Three | 34% | 42.2% | 28.5% |
| FreeThrow | 72% | N/A (uses FT attribute directly) | N/A |

### 11.5 Turnover Probability

```
TurnoverProb = BaseTurnover × (1 + PressAdjust + DefIntensity - BallSecurity)
BaseTurnover = 0.14 per possession
PressAdjust = OpponentPressFrequency × 0.003
DefIntensity = (OpponentDefAggression - 50) × 0.002
BallSecurity = (BallHandlerRating - 50) × 0.003
```

### 11.6 Foul Rate Formula

```
FoulProb = BaseFoulRate × (DefAggressiveness × 0.01) × (FoulProneTendency × 0.008) × (DriveRate × 1.2)
BaseFoulRate = 0.08 per possession
```

Bonus foul probability in final 2 minutes when trailing (intentional foul situations):
```
IntentionalFoulProb = 0.80 if trailing by 1–6 pts with < 60 seconds remaining
```

### 11.7 Rebounding

```
OffRebProb = (TeamOffReb_avg / (TeamOffReb_avg + OppDefReb_avg)) × ZoneBonus × Hustle
```

Zone defense → -8% offensive rebounding for opponents (box-out advantage). Hustle = small random factor from team Competitiveness average.

### 11.8 Home Court Advantage

```
HomeCourtBoost = BaseHCA + FanIntensityBonus + AltitudeBonus
BaseHCA = +3.5 to home team effective rating
FanIntensityBonus = (FanInterest - 50) × 0.06  [range -3 to +3]
AltitudeBonus = factor for high-altitude venues (BYU, Air Force, etc.)
```

Total HCA: +1 to +7 rating points (consistent with real-world ~3–4 point spread advantage).

### 11.9 Referee Bias Model

Each game assigns a random ref crew with tendencies:
```
RefProfile = {
  FoulCallRate: NormalRandom(1.0, 0.08),     [0.85–1.15 multiplier on foul calls]
  HomeWhistleBias: NormalRandom(0.02, 0.01), [slight home team foul advantage]
  TightnessLevel: NormalRandom(1.0, 0.10)    [loose vs tight game]
}
```

Affects foul distribution, free throw attempts, and game flow. Occasionally produces "ref games" with abnormally high foul counts.

### 11.10 Clutch and Upset Mechanics

```
ClutchMultiplier = 1.0 + (ClutchRating - 50) × 0.005  [final 5 min, margin < 8]
UpsetBoost = max(0, (UnderdogCompetitiveness_avg - 60) × 0.3)
```

Produces ~20–25% upset rate for 5-vs-12 seed matchups, matching historical NCAA data.

### 11.11 In-Game Injury

```
InGameInjuryProb = InjuryProneness × (MinutesPlayed / 40) × PhysicalPlayFactor × 0.5
```

Checked every 4 simulated minutes. Severity roll on injury:
- 70% minor (returns after 2–5 min of game time)
- 20% moderate (out for rest of game)
- 10% serious (out for game + future games, see injury system in Phase 6)

---

### Phase 3 Deliverable Checklist

- [ ] Coach attribute model with all 11 attributes
- [ ] Assistant coach system (4 roles per team)
- [ ] Coaching tree data structure
- [ ] Firing/hiring logic with hot seat scoring
- [ ] Buyout calculator
- [ ] Coach development over time
- [ ] 8 playstyle sliders per coach
- [ ] FitScore calculator (player-to-scheme)
- [ ] Possession-by-possession simulation engine
- [ ] Shot quality and make probability formulas
- [ ] Turnover, foul, rebound resolution
- [ ] Home court advantage model
- [ ] Referee bias model
- [ ] Clutch and upset mechanics
- [ ] In-game injury system
- [ ] Fatigue tracking per player per game
- [ ] Full box score generation per game

---

# PHASE 4: SCHEDULING, RANKINGS, AND POSTSEASON

*Build the season structure, evaluation systems, and tournament.*

---

## 12. Scheduling System

### 12.1 Conference Schedule

Round-robin or partial round-robin by conference size. Conferences with 14+ teams play 18–20 games (unbalanced schedule). Rivalry games always scheduled home-and-away. Algorithm ensures every team plays every other team at least once with travel-balanced home/away distribution.

### 12.2 Non-Conference Generation

10–13 non-conference games per team. AI targets:

```
DesiredSOS = ConfAvgPrestige × 0.4 + TeamPrestige × 0.3 + AmbitionFactor × 0.3
```

- High-prestige programs schedule harder
- Mid-majors balance 1–2 resume road games with winnable home games
- **Multi-Team Events (MTEs):** 8–16 pre-season tournaments generated with prestige tiers (e.g., Maui tier vs low-major MTE)

### 12.3 Rivalry System

1–3 designated rivals per team with Rivalry Intensity (0–100):
- Attendance bonus +10%
- Home court boost +1.5
- Media coverage multiplier
- Intensity changes slowly based on competitive history, geography, conference membership

### 12.4 Strength of Schedule

```
SOS = (0.60 × AvgOpponentRating) + (0.25 × AvgOpponentWinPct) + (0.15 × AvgOppSOS)
```

Recursive formula, stabilizes after 3–4 iterations. Produces 0–100 score for tournament selection.

---

## 13. Rankings & Metrics

### 13.1 AP Poll Simulation

65 simulated voters, each with individual bias:

```
VoterScore(team) = (0.30 × WinPct) + (0.25 × AdjEfficiency) + (0.20 × SOS)
                 + (0.15 × BestWins) + (0.10 × EyeTest) + VoterBias
```

- `VoterBias`: ±3 point bias toward 1–2 conferences per voter
- `EyeTest`: composite of MOV, star players, momentum
- Produces realistic poll inertia and preseason bias

### 13.2 Coaches Poll Simulation

Similar to AP but with distinct biases:
```
CoachesPollBias = APVoterBias × 0.5 + OwnConferenceBias × 2.0 + BallotFatigue × 0.3
```

- `OwnConferenceBias`: coaches rank own-conference teams +2 to +5 higher
- `BallotFatigue`: bottom-of-ballot rankings are near-random (±8 variance for ranks 20–25)
- Generally lags AP by 1–2 weeks in reacting to results

### 13.3 NET Rating

```
NET = (0.25 × TeamValue) + (0.25 × NetEfficiency) + (0.20 × WinPctVsQuadrants)
    + (0.15 × AdjWinPct) + (0.15 × ScoringMargin)
```

Quad system:
| Quad | Home | Neutral | Away |
|------|------|---------|------|
| Q1 | vs NET 1–30 | vs NET 1–50 | vs NET 1–75 |
| Q2 | vs NET 31–75 | vs NET 51–100 | vs NET 76–135 |
| Q3 | vs NET 76–160 | vs NET 101–200 | vs NET 136–240 |
| Q4 | vs NET 161+ | vs NET 201+ | vs NET 241+ |

### 13.4 KenPom-Style Efficiency

```
AdjOffEff = RawOffEff × (NationalAvgDefEff / OpponentAdjDefEff)
AdjDefEff = RawDefEff × (NationalAvgOffEff / OpponentAdjOffEff)
OverallRating = AdjOffEff - AdjDefEff
```

Typical range: -15 (worst) to +30 (elite).

### 13.5 Bracketology Engine

```
ResumeScore = (0.25 × Q1Wins) + (0.20 × NET) + (0.15 × SOS)
            + (0.15 × Q1+Q2Record) + (0.10 × ConfRecord) + (0.10 × Last10) + (0.05 × BonusPoints)
```

BonusPoints: road wins, top-10 wins, conference tournament performance. Updated weekly for bracketology projections.

---

## 14. Postseason System

### 14.1 Conference Tournaments

Every conference holds end-of-season tournament. Format by size (8-team single elimination, 12-team with byes, etc.). Winner gets automatic bid.

### 14.2 NCAA Tournament Selection

68 teams: 32 auto-bids + 36 at-large. Selection committee AI explicitly tracks Last Four In / First Four Out. Bubble cutoff varies annually by pool strength.

### 14.3 Seeding and Bracket

S-curve seeding (top 4 overall → #1 seeds, next 4 → #2, etc.). Constraints:
- Same conference can't meet before Sweet 16 (or Elite 8 for large conferences)
- Geographic proximity for early rounds
- Top 4 overall seeds placed in nearest pods

### 14.4 Cinderella Probability

```
CinderellaFactor = (TeamChemistry × 0.25) + (BestPlayerClutch × 0.20)
                 + (CoachTourneyExp × 0.15) + (DefensiveRating × 0.20)
                 + (ScheduleTestedFlag × 0.10) + (Randomness × 0.10)
```

Produces ~1–2 double-digit seeds reaching Sweet 16 per tournament.

### 14.5 NIT and Other Postseason

- NIT: 32 teams (near-miss NCAA)
- CBI: 16 teams
- CIT: 16 teams

Bonuses: prestige +1–3, player development (extra games), recruiting visibility for mid-majors.

---

### Phase 4 Deliverable Checklist

- [ ] Conference schedule generator (round-robin / partial)
- [ ] Non-conference schedule AI with SOS targeting
- [ ] Multi-team event generation
- [ ] Rivalry system with intensity tracking
- [ ] SOS recursive calculation
- [ ] AP Poll simulation with 65 voters + bias
- [ ] Coaches Poll with own-conference bias
- [ ] NET rating calculator
- [ ] KenPom-style adjusted efficiency
- [ ] Quad system classification
- [ ] Bracketology engine with weekly projections
- [ ] Conference tournament bracket generator
- [ ] NCAA tournament selection committee AI
- [ ] S-curve seeding with constraints
- [ ] Cinderella factor calculation
- [ ] NIT/CBI/CIT selection

---

# PHASE 5: AI, ADVANCED STATS, AND AWARDS

*Build the CPU brain and the stat tracking layer.*

---

## 15. Advanced Stats Engine

### 15.1 Player Efficiency Rating

```
SimPER = (PTS + REB + AST + STL + BLK - (FGA-FGM) - (FTA-FTM) - TOV) × (1 / MinPlayed) × LeagueAdjust
```

Normalized: league average = 15.0. Elite = 28–35.

### 15.2 Box Plus/Minus

```
BPM = OffBPM + DefBPM
OffBPM = (Usage × OffRtgAboveAvg × 0.2) + (AST% × 3) + (TOV% × -2) + (ORB% × 1.5)
DefBPM = (STL% × 2) + (BLK% × 1.5) + (DRB% × 1) + (DefRatingBelowAvg × -0.2)
```

### 15.3 On/Off Impact

```
OnCourtNetRating = TeamPtsScored_withPlayer - TeamPtsAllowed_withPlayer (per 100 possessions)
OffCourtNetRating = TeamPtsScored_without - TeamPtsAllowed_without (per 100 possessions)
OnOffDelta = OnCourtNetRating - OffCourtNetRating
```

Minimum 200 possessions for statistical significance flag.

### 15.4 Lineup Synergy Rating

```
SynergyScore = BaseEfficiency + SpacingBonus + TempoMatch + DefComplementarity + ChemistryBonus
```

Tracks every 5-man combination. Balanced lineups (rim protector + 2 shooters + playmaker + slasher) score high. Five ball-dominant guards score low.

### 15.5 Win Shares

```
WinShares = (OffWS + DefWS) / 2
OffWS = MarginalOffense / MarginalPtsPerWin
DefWS = MarginalDefense / MarginalPtsPerWin
```

### 15.6 Usage Rate

```
Usage% = 100 × ((FGA + 0.44 × FTA + TOV) × (TeamMinutes / 5)) / (PlayerMinutes × TeamPossessions)
```

---

## 16. AI Coach Decision Engine

### 16.1 Recruiting AI

```
TargetPriority = (PositionNeed × 0.35) + (TalentGap × 0.30) + (SchemeFit × 0.20) + (Gettability × 0.15)
```

Higher RecruitingSkill → more accurate Gettability evaluation.

### 16.2 In-Game Adjustments

Evaluated every 4 simulated minutes:
- Down 10+ → increase pace, switch to zone, extend press
- Up 10+ → slow pace, conservative defense, bench starters
- Opponent hitting 40%+ from three → switch to man, extend perimeter
- Foul trouble → sub affected player, reduce defensive aggression

Adjustment quality scales with Adaptability and GameManagement. Low-rated coaches make poor or delayed adjustments.

### 16.3 Portal Decisions

```
PortalTargetValue = (PlayerRating - RosterPositionAvg) × NeedWeight + AgeFactor + ImmediateImpact
```

- High-Ambition coaches → target high-impact portal stars
- Development coaches → prefer younger upside players
- Risk-averse coaches → avoid character concerns

### 16.4 Redshirt Decisions

```
RedshirtProb = sigmoid((RosterDepthAtPosition - 8) × 0.5 + (PlayerRating - RosterAvg) × -0.3 + FreshmanFactor)
```

High-DevelopmentSkill coaches redshirt more aggressively.

### 16.5 Lineup Building

```
LineupScore = SUM(PlayerOverall × PositionFit) + SynergyBonus + ExperienceBonus - FatigueProjection
```

AI evaluates all viable 5-man combinations. Top 2–3 lineups are designated (starters, bench unit, closing lineup). AI coaches with low GameManagement may stick with suboptimal lineups too long.

### 16.6 Player Development Focus

Each offseason, AI coaches allocate development emphasis:
```
DevFocusPriority = (AttributeGap × 0.4) + (SchemeNeed × 0.3) + (PlayerRequest × 0.15) + (DraftProjection × 0.15)
```

The top 2–3 attributes are emphasized, receiving 1.3× development multiplier. Other attributes develop at 0.8×.

### 16.7 Risk-Taking Personality

Each AI coach has a hidden `RiskTolerance` (0–99) that affects:
- Press usage in close games
- 3-point shooting frequency when trailing
- Portal vs recruiting emphasis
- Willingness to play freshmen
- Fouling strategy in endgame

---

## 17. Awards System

### 17.1 Annual Awards

| Award | Selection Method |
|-------|-----------------|
| National Player of the Year | Top SimPER + BPM + WinShares composite on Top-25 team |
| All-American (1st, 2nd, 3rd team) | Top 15 by composite; positional balance |
| Defensive POY | Top DefBPM + STL + BLK + DefRating composite |
| Freshman of the Year | Top freshman by SimPER |
| Coach of the Year | Highest WinImpact (actual vs expected) |
| All-Conference teams | Per-conference selection by same composite |
| Conference POY | Top player per conference |
| Conference tournament MVP | Best performer in conf tournament |
| NCAA Tournament MOP | Best performer through Final Four / title game |

### 17.2 Selection Formula

```
AwardScore = (0.30 × SimPER) + (0.25 × BPM) + (0.20 × WinShares) + (0.15 × TeamSuccess) + (0.10 × MediaVisibility)
```

Media visibility correlates with prestige and market size, creating realistic bias toward high-profile programs.

---

### Phase 5 Deliverable Checklist

- [ ] PER calculation engine
- [ ] BPM (offensive + defensive) calculator
- [ ] On/off court impact tracking
- [ ] Lineup synergy scoring for all 5-man combos
- [ ] Win shares calculator
- [ ] Usage rate tracker
- [ ] AI recruiting targeting logic
- [ ] AI in-game adjustment engine
- [ ] AI portal evaluation
- [ ] AI redshirt decision making
- [ ] AI lineup optimization
- [ ] AI development focus allocation
- [ ] Risk-tolerance personality for AI coaches
- [ ] All awards selection (NPOY, All-American, DPOY, FOY, COY, all-conference, etc.)
- [ ] Award history tracking in database

---

# PHASE 6: DYNASTY, BALANCE, AND EVENTS

*Build the long-term simulation layer and all edge cases.*

---

## 18. Long-Term Dynasty System

### 18.1 Record Books

Maintained at player, team, conference, and national level:
- Single-game records (points, assists, rebounds, blocks, steals, 3PM)
- Single-season records
- Career records
- Team season records (wins, losses, MOV, efficiency)
- Tournament records
- Coaching records
- Recruiting class rankings history

### 18.2 Player Legacy Score

```
LegacyScore = (CareerPER × 0.20) + (AllAmericanSelections × 15) + (POYAwards × 25)
            + (TourneyPerformance × 0.15) + (NBADraftPosition × 0.10)
            + (TeamWins × 0.05) + (ConferenceTitles × 5) + (NatChampionships × 20)
```

- Above 85 → program Hall of Fame
- Above 95 → jersey retirement consideration: probability = (LegacyScore - 95) × 20%

### 18.3 Hall of Fame System

**Player HOF:** LegacyScore ≥ 85 + minimum 3 seasons at program
**Coach HOF:** CareerWins ≥ 500 OR Championships ≥ 2 OR FinalFours ≥ 5
**Program-level and national-level halls maintained separately**

### 18.4 Blue Blood Evolution

Recalculated every 5 years. Mid-major sustaining CurrentPrestige > 75 for 10+ years → can rise to Elite. Blue blood below 60 for 15+ years → loses classification.

### 18.5 Dynamic Rule Changes

Every 5–10 years (randomized), from probability pool:

| Possible Rule Change | Probability | System Impact |
|---------------------|------------|---------------|
| Shot clock 30→24 sec | 15% | Increases pace +5 for all teams |
| Transfer sit-out rule added/removed | 20% | Portal volume ±30% |
| NIL spending caps introduced | 15% | Max NIL per player reduced 40% |
| Scholarship limit change (13→15 or 13→11) | 10% | Roster depth, recruiting volume |
| One-and-done rule eliminated | 10% | HS recruits can go direct to NBA, reducing top talent |
| Conference tournament format changes | 20% | Auto-bid drama adjustments |
| Academic eligibility threshold raised | 10% | More ineligibility events |

### 18.6 NIL Inflation and Correction

```
NILInflationRate = 1.03 + (0.01 × CompetitivePressure) per year  [3–4% annual growth]
CorrectionTrigger: if AvgNIL > 3 × BaselineNIL → RegulationEvent probability = 0.30/year
```

### 18.7 NBA Draft Rule Changes

Every 10–15 years, possible changes:
- Age requirement removed (HS to NBA direct)
- Age requirement increased to 20
- Two-round vs three-round draft
- G-League pathway emphasis changes

Each propagates through NBADraftInterest calculations and recruiting dynamics.

---

## 19. Balance & Edge Case Handling

### 19.1 Anti-Dynasty Snowball

Multiple interlocking systems:
- Booster fatigue after sustained high spending
- NBA draft declarations remove best players
- Underdog motivation boost (scales with opponent win streak)
- Assistant coaching poaching weakens staff
- Complacency factor: long win streaks → hidden -2% effort modifier in early season
- Dominant teams get targeted for resume games → harder schedules

### 19.2 Mid-Major Viability

Paths to competitiveness:
- Elite coaching hires (high Dev + Recruiting coaches occasionally choose mid-majors)
- Undervalued portal players that blue blood AI passes on
- Home court multiplier for intense small-gym environments
- Conference tournament auto-bids
- Cinderella factor in NCAA tournament

### 19.3 NIL Economic Stability

Bounded by:
- Booster fatigue (Section 8.5)
- Inflation correction events (Section 18.6)
- 25% per-player soft cap of collective budget
- Logarithmic diminishing returns on NIL recruiting impact

### 19.4 Simulation Health Checks

Every 5 simulated years, engine runs diagnostics:
- Is prestige distribution standard deviation within expected range?
- Are recruiting classes properly distributed?
- Is NIL spending within 2σ of baseline?
- Are win distributions following expected patterns?

Silent corrective adjustments if checks fail (e.g., boosting underperforming mid-major pipelines).

---

## 20. Optional Features & Events

### 20.1 Dynamic Event System

| Event | Frequency | Impact |
|-------|-----------|--------|
| Academic Scandal | 2–3% per team/yr | Scholarship reductions, postseason ban, prestige -10 to -20 |
| FBI Investigation | 0.5–1% per team/yr | Severe sanctions, coaching ban, recruiting penalty 2–3 yr |
| Player Drama | 5–8% per player/yr (scaled by Maturity) | 1–10 game suspension, morale hit |
| Coaching Feud | 1% per coach pair/yr | Recruiting competition bonus, rivalry intensity boost |
| Booster Interference | 3–5% at high-NIL programs | Morale disruption, coaching tension |
| Conference TV Deal | Every 5–8 yr per conference | Revenue shifts, realignment trigger |
| Rule Change | Every 5–10 yr | System-wide formula adjustments |
| Facility Disaster | 0.5% per team/yr | Facility rating -5 to -15, temporary relocation |

### 20.2 Injury System

```
InjuryProb = BaseInjuryRate × InjuryProneness × FatigueMultiplier × PhysicalPlayMultiplier
BaseInjuryRate = 0.015 per game (1.5%)
```

| Severity | Probability | Duration |
|----------|------------|---------|
| Minor | 55% | 1–3 games |
| Moderate | 25% | 4–8 games |
| Major | 15% | 8–16+ games |
| Season-ending (ACL, Achilles) | 5% | Rest of season + recovery penalty |

Players returning from major injuries: -5 to -10 attribute penalty recovering over 3–6 months.

### 20.3 Academic Eligibility

```
AcademicStandingProb = (AcademicRating × 0.40) + (Maturity × 0.25) + (CoachDiscipline × 0.20) + (SchoolAcademicRating × 0.15)
```

Below 2.0 GPA → ineligible. Coach can assign tutors (costs resources, improves odds).

### 20.4 NBA Draft Logic

```
DraftDeclarationProb = (ProjectedDraftPosition × 0.40) + (NILSatisfaction × -0.15)
                     + (Age × 0.10) + (Ambition × 0.15) + (CoachInfluence × -0.10) + (LoyaltyAnchor × -0.10)
```

- Projected lottery → >90% declaration
- Projected 2nd round → 40–60%
- Undrafted projection → <15%
- "Test the waters" option: enter and withdraw based on feedback

### 20.5 Redshirt System

- Freshmen can be redshirted (develop at 70% rate, no game appearances)
- 4-game rule: play up to 4 games and still redshirt
- Strategic early-season decision point

### 20.6 Sanctions

| Severity | Scholarships | Postseason Ban | Recruiting | Prestige Hit |
|----------|-------------|---------------|-----------|-------------|
| Minor | 0–1 for 1 yr | None | 2 fewer visits 1 yr | -3 to -5 |
| Moderate | 1–3 for 2 yr | 1 year | Reduced contact 2 yr | -8 to -12 |
| Major | 3–5 for 3 yr | 1–2 years | No official visits 2 yr | -15 to -25 |
| Death Penalty | Program shut 1–2 yr | 2+ years | Full ban | -40 to -60 |

### 20.7 Media Narrative Engine

Template-based generation: preseason predictions, weekly power rankings commentary, upset reactions, Cinderella stories, hot seat articles, recruiting battles, dynasty retrospectives. Narratives affect poll voting bias and recruit interest.

### 20.8 Weather/Travel Impact

For games in certain regions during winter months:
```
TravelFatigue = max(0, (DistanceTraveled - 500) / 1000) × 1.5  [rating point penalty]
```

Teams traveling 2000+ miles for a road game suffer -3 to -4.5 effective rating penalty. Back-to-back road games compound this.

---

### Phase 6 Deliverable Checklist

- [ ] Record book tracking (player, team, conference, national)
- [ ] Player legacy score calculator
- [ ] Jersey retirement logic
- [ ] Hall of Fame induction system (player + coach)
- [ ] Blue blood reclassification every 5 years
- [ ] Dynamic rule change event system
- [ ] NIL inflation tracking and correction events
- [ ] NBA draft rule change events
- [ ] Anti-dynasty snowball mechanisms active
- [ ] Mid-major viability systems active
- [ ] NIL economic stability guardrails
- [ ] Simulation health checks (every 5 sim-years)
- [ ] All event types generating (academic, FBI, drama, feuds, boosters, TV deals, facility)
- [ ] Full injury system (in-game + season-long)
- [ ] Academic eligibility checks each semester
- [ ] NBA draft declaration and testing waters flow
- [ ] Redshirt system with 4-game rule
- [ ] Sanctions system (all 4 severity levels)
- [ ] Media narrative template engine
- [ ] Weather/travel fatigue system
- [ ] 50-year simulation stability test passing

---

# APPENDIX A: Complete Formula Reference

## Prestige & Team
| Formula | Section |
|---------|---------|
| ConferencePrestige | 2.2 |
| RealignmentTriggerProb | 2.3 |
| MoveUtility | 2.3 |
| PrestigeDelta | 3.2 |
| DecayRate | 3.3 |
| UpgradeCost | 3.4 |
| FanInterest | 3.5 |
| AnnualRevenue | 3.6 |

## Player Development
| Formula | Section |
|---------|---------|
| SeasonDevPoints | 4.6 |
| BaseDev | 4.6 |
| RegressionRate | 4.8 |
| Overall Rating | 4.9 |

## Recruiting
| Formula | Section |
|---------|---------|
| CompositeScore (star rating) | 6.2 |
| ScoutingUncertainty | 6.3 |
| InterestDelta | 6.4 |
| NBATrackRecord | 6.5 |
| OfficialVisitBoost | 6.6 |
| CommitProbability | 6.7 |
| DecommitProb | 6.8 |

## Portal & NIL
| Formula | Section |
|---------|---------|
| PortalEntryProb | 7.1 |
| PortalPlayerValue | 7.2 |
| TamperRisk | 7.4 |
| AnnualNILBudget | 8.1 |
| PlayerNILValue | 8.2 |
| SocialMediaDelta | 8.3 |
| BoosterFatigue | 8.5 |
| JealousyFactor | 8.6 |
| NILRecruitingImpact | 8.7 |

## Coaching
| Formula | Section |
|---------|---------|
| HotSeatScore / FiringProb | 9.4 |
| HireScore | 9.5 |
| Buyout | 9.6 |
| CoachDevRate | 9.7 |

## Game Simulation
| Formula | Section |
|---------|---------|
| ShotQuality | 11.3 |
| MakeProbability | 11.4 |
| TurnoverProb | 11.5 |
| FoulProb | 11.6 |
| OffRebProb | 11.7 |
| HomeCourtBoost | 11.8 |
| ClutchMultiplier | 11.10 |
| InGameInjuryProb | 11.11 |

## Rankings & Postseason
| Formula | Section |
|---------|---------|
| VoterScore (AP) | 13.1 |
| CoachesPollBias | 13.2 |
| NET | 13.3 |
| AdjOffEff / AdjDefEff | 13.4 |
| ResumeScore | 13.5 |
| CinderellaFactor | 14.4 |

## Advanced Stats
| Formula | Section |
|---------|---------|
| SimPER | 15.1 |
| BPM | 15.2 |
| OnOffDelta | 15.3 |
| SynergyScore | 15.4 |
| WinShares | 15.5 |
| Usage% | 15.6 |

## AI & Dynasty
| Formula | Section |
|---------|---------|
| TargetPriority (recruiting AI) | 16.1 |
| PortalTargetValue (AI) | 16.3 |
| RedshirtProb (AI) | 16.4 |
| LineupScore (AI) | 16.5 |
| DevFocusPriority (AI) | 16.6 |
| AwardScore | 17.2 |
| LegacyScore | 18.2 |
| NILInflationRate | 18.6 |
| InjuryProb | 20.2 |
| DraftDeclarationProb | 20.4 |
| TravelFatigue | 20.8 |

---

# APPENDIX B: Phase Summary

| Phase | Focus | Key Systems |
|-------|-------|-------------|
| **Phase 1** | Foundation | Universe, teams, players, database, prestige, facilities |
| **Phase 2** | Acquisition | Recruiting, portal, NIL, scouting, economics |
| **Phase 3** | Gameplay | Coaching, playstyle, game sim engine, refs, clutch |
| **Phase 4** | Season | Scheduling, rankings, polls, bracketology, postseason |
| **Phase 5** | Intelligence | AI coaches, advanced stats, awards |
| **Phase 6** | Longevity | Dynasty, balance, events, injuries, sanctions, 50-yr stability |

---

*End of document. Hand any phase to an AI or developer with the instruction "Build Phase X" and they have the full specification.*
