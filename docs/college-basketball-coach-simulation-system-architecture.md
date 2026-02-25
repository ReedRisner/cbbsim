College Basketball Coach Simulation — System Architecture
COLLEGE BASKETBALL COACH 
SIMULATION
Complete System Architecture & Game Design Document
Version 1.0  |  February 2026
A Football-Manager-depth simulation for college basketball.
Designed for 50+ year dynasty simulation with full NIL, Transfer Portal, and NCAA ecosystem 
modeling.
Page 1
Table of Contents
College Basketball Coach Simulation — System Architecture
1. Core Game Philosophy
2. Universe Structure
3. Team Systems
4. Player Archetype System
5. Recruiting System
6. Transfer Portal System
7. NIL System
8. Coaching System
9. Playstyle System
10. Game Simulation Engine
11. Scheduling System
12. Rankings & Metrics
13. Postseason System
14. Long-Term Dynasty System
15. Advanced Stats Engine
16. AI Coach Decision Engine
17. Database Structure
18. Balance & Edge Case Handling
19. Optional Features & Events
Page 2
0. Implementation Roadmap by Phase
College Basketball Coach Simulation — System Architecture
Use this section as an execution checklist. You can issue implementation requests as “do Phase 1,” “do Phase 2,” etc.

Phase 1 — Foundation Vertical Slice (Playable Prototype)
Goal: deliver a complete single-season loop with generated teams, schedule, game simulation, standings, and a usable management UI.
Includes:
- Sections 1, 2.1, 3.1, 9 (core parts), 10 (core parts), 11 (core parts), 12 (basic), 17 (minimum schema)
- Team + conference generation
- Basic roster/team ratings and prestige
- Season schedule generation (conference + non-conference simplified)
- Possession/game simulation with box scores and final records
- Basic rankings (poll + NET-like composite)
- Frontend pages: dashboard, team profile, standings, game log
- Save/load league state
Exit Criteria:
- User can start a new universe, simulate day/week/season, and view standings + postseason bracket.
- Data persists in DB and reload works.

Phase 2 — Recruiting + Portal + NIL Core Systems
Goal: make roster construction strategic across seasons.
Includes:
- Sections 4, 5, 6, 7 (first complete pass)
- Recruit generation by class year, archetype, and region
- Scouting uncertainty and confidence intervals
- Recruiting pipelines + AI competition for prospects
- Transfer portal entry logic, tampering risk, and destination utility model
- NIL offers and budget constraints tied to boosters/program profile
- Scholarship and roster limit enforcement
Exit Criteria:
- User completes offseason with recruits signed, portal players added/lost, NIL budget updated.
- AI teams also recruit/portal realistically.

Phase 3 — Coaching, Scheme, and AI Decision Layer
Goal: make team identity and coach behavior materially affect outcomes.
Includes:
- Sections 8, 9, 16
- Coach attributes, tendencies, and hot-seat logic
- Playstyle interaction matrix (pace, spacing, pressure, rebounding emphasis)
- In-game tactical adjustments by AI coach profiles
- Staff hiring/firing and progression
Exit Criteria:
- Different coaches produce measurably different sim outputs with same raw talent.
- Coaching carousel works each offseason.

Phase 4 — Postseason, Metrics, and Narrative Depth
Goal: deliver full competitive structure and immersion.
Includes:
- Sections 12, 13, 15, 19
- Conference tournaments and selection committee logic
- Full NCAA bracket generation and sim
- Expanded advanced stats engine (lineup/offensive/defensive splits)
- News feed, storylines, awards, and rivalry events
Exit Criteria:
- Full season-to-title loop with realistic seeding, bids, and tournament outcomes.
- User can review awards, records, and narrative recap.

Phase 5 — Long-Term Dynasty and World Evolution
Goal: maintain realism and balance over 50+ seasons.
Includes:
- Sections 2.2-2.4, 3.2-3.5, 14, 18
- Prestige growth/decay tuning
- Conference realignment cycles
- Rule changes, sanctions, and economy drift controls
- Historical tracking (record books, coach legacy, program era scoring)
Exit Criteria:
- Multi-decade sims remain stable, diverse, and balanced.
- No dominant runaway behavior without tradeoffs.

Phase 6 — Production Hardening and Release Readiness
Goal: ship-quality reliability, UX polish, and operational tooling.
Includes:
- Performance profiling/optimization for long-horizon simulation
- Deterministic seeded simulation mode for reproducible tests
- Comprehensive automated tests (unit, integration, e2e)
- Save migration/versioning strategy
- Observability, crash recovery, and export/import tooling
Exit Criteria:
- Release candidate quality: stable, tested, and performant for long dynasties.

1. Core Game Philosophy
College Basketball Coach Simulation — System Architecture
1.1 Design Pillars
This simulation is built on four non-negotiable design pillars that inform every system interaction, 
formula weight, and UI decision in the game.
Pillar 1: Systemic Realism Over Arcade Fun
Every outcome emerges from interlocking systems, not scripted events. A recruit choosing your 
rival isn't random; it's the output of NIL offers, playing time projections, facility ratings, coaching 
charisma, distance from home, personality traits, and program prestige all feeding into a 
weighted decision function. The player should feel that the simulation world operates by 
consistent, discoverable rules.
Pillar 2: Long-Horizon Consequences
Every decision the player makes should have consequences that ripple across 5, 10, or even 20 
seasons. Overspending on NIL today creates booster fatigue tomorrow. Neglecting player 
development in favor of portal shopping erodes your coaching reputation for development
minded recruits. The game rewards strategic patience and punishes short-term thinking in 
realistic ways.
Pillar 3: Fog of War and Imperfect Information
The user never sees a recruit's true overall rating. Scouting reports have confidence intervals. A 
4-star recruit may have a hidden potential ceiling of 58 or 88. Transfer portal players may have 
inflated stats from weak conferences. The game models the real-world uncertainty that makes 
college basketball coaching so challenging.
Pillar 4: Emergent Narrative
The simulation should generate stories organically. A walk-on who develops into an All
American. A mid-major that raids the portal and makes a Cinderella run. A blue blood that 
collapses under NCAA sanctions. These emerge from systems, not scripts. The game tracks 
and surfaces these narratives through a dynamic media system.
1.2 Simulation Mode
The game operates as a hardcore management simulation. There is no real-time gameplay; all 
games are simulated via a possession-by-possession engine. The user's role is strategic: 
recruiting, roster construction, scheme design, in-game adjustment sliders, and long-term 
program building. The target audience is the overlap between college basketball obsessives, 
Football Manager veterans, and OOTP Baseball fans.
1.3 Data Architecture
Page 3
College Basketball Coach Simulation — System Architecture
The simulation is data-driven at its core. Every entity (player, team, coach, conference, recruit) 
is defined by a rich attribute model with 30-100+ data points. Formulas govern all interactions. 
Random variance is applied via normal distributions with defined standard deviations, never flat 
random rolls. This ensures realistic clustering of outcomes while preserving the possibility of 
outliers.
1.4 Time Horizon
The game is designed to simulate 50+ consecutive seasons without systemic degradation, 
inflation collapse, or unrealistic drift. Self-correcting mechanisms (prestige decay, booster 
fatigue, salary cap soft limits, NCAA rule changes) prevent runaway dynasty snowballing or 
permanent mid-major death spirals. The simulation should feel as realistic in Year 40 as in Year 
1.
Page 4
2. Universe Structure
College Basketball Coach Simulation — System Architecture
2.1 Teams and Conferences
The simulation includes 362 Division I programs organized into 32 conferences (mirroring the 
real 2024-25 NCAA landscape or a fictional analog). Each conference has between 8 and 18 
members.
Tier
Example Conferences Teams Prestige Range Auto-Bid Value
Power 4
SEC, Big Ten, Big 12, ACC
~68
65-99
1.0
Upper Mid
Major
AAC, Mountain West, WCC, A
10
~56
40-70
0.7
Mid-Major
MVC, MAC, Sun Belt, CUSA
~80
20-55
0.5
Low-Major
MEAC, SWAC, Southland, 
NEC
~100+
5-35
0.3
2.2 Conference Prestige Formula
Each conference has a composite prestige score recalculated annually:
ConferencePrestige = (0.40 * AvgTeamPrestige) + (0.25 * Top5TeamAvg) + 
(0.15 * NCAATourneySuccess_3yr) + (0.10 * MediaDealValue) + (0.10 * 
HistoricalWeight)
Where NCAATourneySuccess_3yr is a rolling 3-year weighted sum (current year 50%, year-1 
30%, year-2 20%) of tournament wins by conference members, normalized to 0-100. 
MediaDealValue is derived from the conference TV contract tier (0-100 scale). HistoricalWeight 
is a slowly decaying average of all-time conference prestige.
2.3 Realignment System
Conference realignment is modeled as an event-driven system that can trigger under specific 
conditions. Every 3-5 years (randomized), the simulation evaluates realignment probability:
RealignmentTriggerProb = 0.05 + (0.03 * |ConfPrestigeDelta|) + (0.10 * 
MediaDealExpiring) + (0.05 * ProgramDissatisfaction)
When realignment triggers, the system identifies candidate movers using a utility function:
MoveUtility(Team, NewConf) = (0.35 * PrestigeGain) + (0.25 * RevenuGain) + 
(0.20 * GeographicFit) + (0.10 * RivalryPreservation) + (0.10 * 
CompetitiveFit)
Teams move to the conference offering the highest MoveUtility above a threshold of 0.6. The 
receiving conference must also benefit (their ConferencePrestige must not drop by more than 5 
points). Realignment cascades are possible: one team leaving can trigger another team leaving 
the same conference within the same cycle.
2.4 Blue Blood Classification
The simulation dynamically classifies programs into tiers based on sustained performance:
Page 5
College Basketball Coach Simulation — System Architecture
Classification
Criteria
Count (Approx)
Blue Blood
HistPrestige >= 90 AND CurrentPrestige >= 75 AND 
FinalFours >= 6
6-8
Elite
CurrentPrestige >= 80 OR (HistPrestige >= 75 AND 
CurrentPrestige >= 65)
10-15
Upper Tier
Mid Tier
Lower Tier
CurrentPrestige >= 60
25-35
CurrentPrestige 35-59
80-120
CurrentPrestige < 35
150+
Classifications update annually and affect recruiting bonuses, media coverage, and AI coaching 
hires.
Page 6
3. Team Systems
College Basketball Coach Simulation — System Architecture
3.1 Team Attribute Model
Every team in the simulation is defined by the following core attributes, each rated 0-100 unless 
otherwise noted:
Attribute
Description
Update Frequency
CurrentPrestige
Reflects recent (3-5 year) on-court success, recruiting, 
and media visibility
Annual
HistoricalPrestige
All-time program legacy; decays very slowly (0.5/yr 
toward CurrentPrestige)
Annual
FacilityRating
Quality of arena, practice facility, weight room, dorms
On investment
NILCollectiveStrength Financial power of the team's NIL collective (0-100)
Annual
BoosterBudget
Annual discretionary funds from boosters (in $100K 
units, range 0-500)
Annual
RecruitingRegions
Array of 1-4 geographic pipeline regions with affinity 
scores
Static + coach
FanBaseIntensity
How engaged and demanding the fanbase is (affects 
morale, hot seat)
Annual
MediaMarket
Size of the team's media market (affects NIL, revenue, 
recruit visibility)
Static
ArenCapacity
Seating capacity; affects revenue and home court 
advantage
On investment
Academic Rating
Affects academic eligibility rates and appeals to 
academic-minded recruits
Static
3.2 Prestige Growth Formula
Prestige changes annually based on on-court results, recruiting success, and external factors:
PrestigeDelta = (0.35 * WinImpact) + (0.25 * TourneyImpact) + (0.15 * 
RecruitingClassRank) + (0.10 * NFLDraftPicks) + (0.08 * MediaBuzz) + (0.07 
* FacilityBonus) - Sanctions
Where WinImpact = (ActualWins - ExpectedWins) * 1.5, capped at +/- 8. TourneyImpact maps 
tournament results to point values: Round of 64 exit = +0.5, Round of 32 = +1.5, Sweet 16 = +3, 
Elite 8 = +5, Final Four = +8, Championship Game = +11, Title = +15. Missing the tournament 
when expected costs -3 to -6. RecruitingClassRank is normalized so the #1 class = +5 and #100 
= -2.
3.3 Prestige Decay
Programs that underperform experience prestige decay that accelerates over time:
DecayRate = BaseDecay * (1 + 0.15 * ConsecutiveUnderperformYears)
Page 7
College Basketball Coach Simulation — System Architecture
BaseDecay = max(0, (ExpectedWins - ActualWins) * 0.8)
A team expected to win 22 games that wins only 14 would lose (22-14)*0.8 = 6.4 prestige points 
in Year 1. If they underperform again in Year 2, the multiplier increases: 6.4 * 1.15 = 7.36.
Historical prestige decays much more slowly: it moves 0.5 points per year toward the 10-year 
rolling average of CurrentPrestige. A program with HistoricalPrestige of 95 that has averaged 60 
CurrentPrestige over the last decade would still have HistoricalPrestige of ~90 after 10 years, 
preserving legacy advantages.
3.4 Facility Investment
Teams can invest booster funds to improve facilities. Cost scales non-linearly:
UpgradeCost(currentRating, targetRating) = SUM from r=current to target 
of: BaseCost * (1.04 ^ r)
BaseCost = $200K per point at rating 0
So improving from 50 to 55 costs roughly $200K * (1.04^50 + 1.04^51 + ... + 1.04^54) = 
approximately $7.4M. Improving from 90 to 95 costs approximately $38M. This naturally limits 
facility arms races. Facilities degrade at -1 point every 3 years without maintenance investment.
3.5 Fan Interest Model
Fan interest drives revenue, home court advantage, and hot seat pressure:
FanInterest = (0.30 * CurrentPrestige) + (0.25 * RecentWinPct_3yr) + (0.20 
* FanBaseIntensity) + (0.15 * StarPlayerPresence) + (0.10 * 
RivalryIntensity)
FanInterest above 75 grants a +3 home court advantage bonus. Below 30, booster donations 
decline by 20%. Below 20, arena attendance drops to 60%, reducing game-day revenue.
Page 8
College Basketball Coach Simulation — System Architecture
4. Player Archetype System
4.1 Player Attribute Model
Each player is defined by approximately 50 attributes across six categories. All ratings are 0-99 
unless noted.
Physical Attributes (6)
Attribute Description Affected By
Height In inches (72-87 typical range) Static after age 19
Wingspan In inches; affects blocks, steals, rebounding Static
Weight In pounds; affects post play, physicality Training (+/- 5 lbs/yr max)
Speed Straight-line quickness Age curve, training
Vertical Leaping ability Age curve, training
Stamina Endurance before fatigue penalties Training, age
Skill Attributes (18)
Attribute Category Description
CloseShot Offense Finishing at the rim, layups, floaters
MidRange Offense Pull-up and catch-and-shoot from mid-range
ThreePoint Offense Spot-up, off-dribble, and deep three-point shooting
FreeThrow Offense Free throw accuracy
PostMoves Offense Back-to-basket moves, hooks, fades
BallHandling Offense Dribble moves, turnover avoidance under pressure
Passing Offense Vision, accuracy, pocket passes
OffRebounding Hustle Positioning and effort on offensive glass
DefRebounding Defense Defensive board positioning and boxing out
InteriorDef Defense Shot blocking, rim protection, post defense
PerimeterDef Defense On-ball defense, lateral quickness, staying in front
StealAbility Defense Active hands, passing lane reads
ShotIQ Mental Shot selection, knowing when to shoot vs pass
DefIQ Mental Rotations, help defense, positioning
ScreenSetting Offense Pick quality, roll timing
OffBallMovement Offense Cutting, spacing, relocating
TransitionPlay Offense Effectiveness in fast break situations
DrawFouls Offense Ability to get to the foul line
Page 9
College Basketball Coach Simulation — System Architecture
Tendencies (8)
Tendencies are not skill levels; they describe HOW a player plays. Rated 0-99:
Tendency Low (0-30) High (70-99)
AggressionOffense Conservative, low usage Ball-dominant, high usage
AggressionDefense Stays home, positional Gambles for steals/blocks
ThreePointFrequency Rarely shoots threes High-volume three shooter
PostUpFrequency Faces up or perimeter Frequently posts up
TransitionPush Slows it down Always pushes tempo
PassFirst Looks to score first Pass-first mentality
FlashyPlay Fundamental Flashy but higher turnover risk
FoulProne Disciplined Commits fouls frequently
Personality Traits (7)
Trait Range Impact
WorkEthic 0-99 Development speed multiplier: 0.7x (low) to 1.4x (high)
Loyalty 0-99 Portal entry probability, decommit chance, coach attachment
Ego 0-99 Playing time demands, NIL expectations, chemistry impact
Coachability 0-99 Scheme fit speed, adjustment to new playstyle
Competitiveness 0-99 Clutch multiplier, practice intensity, rivalry boosts
Leadership 0-99 Team morale buffer, locker room influence
Maturity 0-99 Off-court incident risk, academic focus, media handling
Hidden/Special Attributes (6)
Attribute Visibility Description
TruePotential Hidden Ceiling rating (40-99); determines max 
development
PotentialVariance Hidden How uncertain the ceiling is (low = reliable, high = 
boom/bust)
InjuryProneness Partially Hidden Base probability of injury per game (0.5%-5%)
ClutchRating Hidden until proven Performance modifier in final 5 mins of close 
games
Consistency Partially Hidden Game-to-game variance in performance (low = 
volatile)
NBADraftInterest Dynamic Likelihood of declaring for draft (recalculated each 
March)
4.2 Potential and Development System
Player development is the core progression loop. Each offseason and throughout the season, 
players develop (or regress) based on a complex formula:
Page 10
College Basketball Coach Simulation — System Architecture
SeasonDevPoints = BaseDev * WorkEthicMult * CoachDevSkill * 
PlayingTimeMult * AgeFactor * FitBonus
Where BaseDev is determined by the gap between current rating and TruePotential:
BaseDev = (TruePotential - CurrentOverall) * 0.12  [if gap > 10]
BaseDev = (TruePotential - CurrentOverall) * 0.06  [if gap 1-10]
BaseDev = 0  [if at or above TruePotential]
WorkEthicMult ranges from 0.7 (WorkEthic < 20) to 1.4 (WorkEthic > 90). CoachDevSkill is the 
head coach's Development attribute / 100, ranging 0.6-1.2. PlayingTimeMult = min(1.0, 
MinutesPerGame / 25); players who ride the bench develop slower. AgeFactor peaks at age 19
20 (1.1x) and drops to 0.8x at age 23+. FitBonus is +0.1 if the player's archetype matches the 
coach's playstyle.
4.3 Development Curves
Players follow one of five hidden development curves, assigned at generation:
Curve Type
Probability
Peak Age
Development Pattern
Early Bloomer
15%
19-20
Fast initial growth, plateaus early, earlier 
regression
Standard
45%
21-22
Steady linear improvement through 
junior/senior year
Late Bloomer
20%
22-24
Slow start, significant jumps in Year 3-4
Bust
12%
N/A
TruePotential overestimated by 10-25 points; 
never reaches projected ceiling
Freak Leap
4.4 Regression
8%
Varies
One season of massive improvement (+12-18 
points), then normal trajectory
Players begin regressing after their peak age, which varies by position:
RegressionRate = BaseRegression * (Age - PeakAge) * PositionFactor
BaseRegression = 1.5 points/year for physical attributes, 0.5 points/year 
for skill attributes
Guards peak earlier (age 21-22) than bigs (age 22-23) in college terms. Since most players 
leave by age 22, regression primarily affects 5th-year seniors and grad transfers.
4.5 Overall Rating Calculation
The visible 'Overall' rating is calculated using position-weighted attribute averages:
Overall = SUM(Attribute_i * PositionWeight_i) / SUM(PositionWeight_i)
A point guard weights BallHandling (1.5x), Passing (1.3x), PerimeterDef (1.2x), and Speed 
(1.2x) heavily, while PostMoves (0.2x) and InteriorDef (0.3x) matter little. A center inverts these 
Page 11
College Basketball Coach Simulation — System Architecture
weights. This means a 75-overall PG and a 75-overall C have very different attribute profiles but 
equivalent value at their positions.
Page 12
5. Recruiting System
College Basketball Coach Simulation — System Architecture
5.1 Recruit Generation
Each year, the simulation generates approximately 450-550 high school recruits, 100-150 junior 
college (JUCO) transfers, and 20-40 international prospects. Recruits are distributed 
geographically based on real-world basketball talent density (weighted toward the Eastern 
seaboard, Texas, California, Illinois, Indiana, and Georgia).
5.2 Star Rating Formula
Star ratings (2-5 stars, with unranked below 2-star) are derived from scouted potential, not true 
potential:
ScoutedOverall = TrueOverall + NormalRandom(0, ScoutingUncertainty)
ScoutedPotential = TruePotential + NormalRandom(0, ScoutingUncertainty * 
1.5)
CompositeScore = (0.40 * ScoutedPotential) + (0.35 * ScoutedOverall) + 
(0.15 * Measurables) + (0.10 * EventPerformance)
Star Rating
Composite Score Range
Approx Count/Year
Avg True Potential
5-Star
92-99
25-35
82-95
4-Star
80-91
100-130
70-88
3-Star
65-79
200-250
55-78
2-Star
50-64
100-150
42-65
Unranked
<50
Unlimited (walk-ons)
30-55
Note the overlap in True Potential ranges. A 3-star recruit with TruePotential of 78 may 
outperform many 4-stars. This is by design and reflects real-world scouting uncertainty.
5.3 Scouting Fog of War
The user does not see true ratings. Instead, they see scouted grades with confidence levels:
ScoutingUncertainty = BaseUncertainty * (1 - ScoutingInvestment) * 
PositionFactor * GeographyFactor
BaseUncertainty is 15 for all recruits. ScoutingInvestment is normalized 0-1 based on how much 
scouting effort you've invested (visits, film study, camp evaluations). PositionFactor is 1.0 for 
guards, 1.2 for wings, 1.4 for bigs (big men are harder to evaluate). GeographyFactor is 1.0 for 
domestic, 1.5 for international.
With zero scouting, a player's displayed range might be '65-85 potential' (uncertainty of +/-10). 
With maximum scouting, it narrows to '73-79 potential' (uncertainty of +/-3). You can never 
eliminate uncertainty entirely.
5.4 Recruit Interest Calculation
Page 13
College Basketball Coach Simulation — System Architecture
Each recruit maintains an Interest score (0-100) for every school that is recruiting them. Interest 
updates weekly during the recruiting cycle:
InterestDelta = (PrestigeWeight * PrestigeFactor) + (ProximityWeight * 
DistanceFactor) + (PlayingTimeWeight * PTProjection)
  + (NILWeight * NILOffer) + (CoachWeight * CoachCharisma) + (StyleWeight 
* PlaystyleFit)
  + (DevWeight * CoachDevReputation) + (WinWeight * RecentSuccess) + 
(RelationshipWeight * RecruitingEffort)
Weights vary by recruit personality. A high-Ego recruit weights NIL and Prestige heavily. A high
Loyalty recruit weights Proximity and Relationship. A pro-focused recruit weights DevReputation 
and NBA draft history.
5.5 Visit System
Recruits can take up to 5 official visits and unlimited unofficial visits. Each visit modifies interest:
OfficialVisitBoost = 5 + (FacilityRating / 20) + (FanInterest / 25) + 
(CoachCharisma / 30)
UnofficialVisitBoost = OfficialVisitBoost * 0.4
A visit to a school with top facilities (90), high fan interest (80), and a charismatic coach (85) 
would yield: 5 + 4.5 + 3.2 + 2.8 = +15.5 interest points. Visit timing matters: late visits (after 
January) get a 1.3x multiplier due to urgency.
5.6 Commitment Logic
A recruit commits when their top school's interest exceeds 80 AND leads the second-place 
school by at least 15 points. If no school meets this threshold by signing day, the recruit 
commits to their highest-interest school above 60. Below 60, the recruit goes to a random 
school in their tier range.
CommitProbability = sigmoid((TopInterest - 80) / 5) * sigmoid((TopInterest - SecondInterest - 15) / 5)
5.7 Decommitment and Flips
After committing, a recruit can decommit if conditions change:
DecommitProb = BaseDecommit * (1 - Loyalty/100) * TriggerMultiplier
BaseDecommit is 0.03 per week (3%). TriggerMultiplier increases based on events: coach fired 
= 5x, program sanctions = 4x, better NIL offer = 2x, key player transfer = 1.5x. A low-loyalty (20) 
recruit facing a coaching change has DecommitProb = 0.03 * 0.8 * 5 = 12% per week, likely to 
flip. A high-loyalty (90) recruit has only 0.03 * 0.1 * 5 = 1.5% per week.
Page 14
6. Transfer Portal System
College Basketball Coach Simulation — System Architecture
6.1 Portal Entry Logic
After each season, every player evaluates whether to enter the transfer portal. The decision is 
modeled as a probability based on dissatisfaction factors:
PortalEntryProb = BaseRate + PTFrustration + NILGap + CoachChangePush + 
SanctionsPush + PersonalityFactor - LoyaltyAnchor
Component definitions:
BaseRate = 0.05 (5% of all players consider transferring regardless)
PTFrustration = max(0, (ExpectedMinutes - ActualMinutes) / ExpectedMinutes 
* 0.30)
NILGap = max(0, (MarketValueNIL - CurrentNIL) / MarketValueNIL * 0.15)
CoachChangePush = 0.25 if head coach fired/left, 0.10 if key assistant 
left
SanctionsPush = 0.20 if program under sanctions
PersonalityFactor = (Ego / 100) * 0.10 - (Maturity / 100) * 0.05
LoyaltyAnchor = (Loyalty / 100) * 0.20
Example: A player with 30% playing time frustration, no NIL gap, high ego (80), medium loyalty 
(50), and a coaching change would have: 0.05 + 0.30 + 0 + 0.25 + 0 + 0.08 - 0.10 = 58% 
probability of entering the portal.
6.2 Portal Market Dynamics
The portal operates as a marketplace. Transfer players are evaluated similarly to recruits, but 
with known (not scouted) ratings, reduced by a TransferAdjustment:
PortalPlayerValue = CurrentOverall - ContextDiscount + SystemBonus
ContextDiscount = max(0, (OldTeamSOS - 50) * -0.3) [penalizes stats padded 
vs weak opponents]
SystemBonus = FitScore(Player, NewCoachPlaystyle) * 3
6.3 Immediate Eligibility
By default, all one-time transfers receive immediate eligibility. The simulation includes a toggle 
for sit-out rules for second-time transfers. If the NCAA rule changes (modeled via the Dynamic 
Rule system), this logic updates accordingly.
6.4 Tampering
AI coaches and the player's own program may engage in soft tampering. Tampering risk is:
TamperRisk = (CoachEthics < 40) * 0.15 + (NILCollective > 80) * 0.10 + 
(PlayerValue > 85) * 0.10
Page 15
College Basketball Coach Simulation — System Architecture
If tampering is detected (random audit with 5% chance per flagged interaction), the offending 
program receives a recruiting penalty.
Page 16
7. NIL System
College Basketball Coach Simulation — System Architecture
7.1 NIL Economic Model
The NIL system models the flow of money from boosters and donors through NIL collectives to 
players. It is designed to be a powerful but self-balancing economic system.
7.2 Collective Funding Formula
AnnualNILBudget = (BoosterBase * MediaMarketMult * PrestigeMult * 
FanInterestMult) * (1 + DonorMomentum)
BoosterBase = BoosterBudget * $100K [raw dollar amount]
MediaMarketMult = 0.6 + (MediaMarket / 100) * 0.8 [range 0.6-1.4]
PrestigeMult = 0.5 + (CurrentPrestige / 100) * 1.0 [range 0.5-1.5]
FanInterestMult = 0.7 + (FanInterest / 100) * 0.6 [range 0.7-1.3]
DonorMomentum = 0.15 if made tournament, 0.25 if Sweet16+, -0.10 if missed 
tournament
Example: A blue blood with BoosterBudget 400, MediaMarket 90, Prestige 92, FanInterest 85, 
coming off a Final Four run: Budget = 400 * $100K * 1.32 * 1.42 * 1.21 * 1.25 = ~$113M. A low
major with BoosterBudget 15, MediaMarket 20, Prestige 18, FanInterest 30: Budget = 15 * 
$100K * 0.76 * 0.59 * 0.88 * 0.90 = ~$533K. This 200:1 ratio mirrors real-world NIL disparities.
7.3 Player NIL Value
PlayerNILValue = (PerformanceScore * 0.40) + (SocialMediaRating * 0.25) + 
(MarketAppeal * 0.20) + (TeamPrestige * 0.15)
PerformanceScore is based on stats (points, assists, PER). SocialMediaRating (0-99) is 
generated per player and grows with performance and market size. MarketAppeal factors in 
personality, charisma, and position (guards typically higher).
7.4 Booster Fatigue
To prevent NIL inflation spiraling, boosters experience fatigue:
BoosterFatigue = max(0, (CumulativeSpending_3yr / BoosterCapacity) - 1.0) 
* 0.20
When fatigue exceeds 0, the NIL budget is reduced by the fatigue factor. A program that 
massively overspends for 3 consecutive years sees their budget cut by up to 20%. This self
corrects NIL arms races.
7.5 NIL Jealousy
Players on the same team compare NIL deals. If a player perceives unfairness:
JealousyFactor = max(0, (TeammateTopNIL - PlayerNIL) / TeammateTopNIL - 
ExpectedGap) * (Ego / 100)
Page 17
College Basketball Coach Simulation — System Architecture
High-ego players who feel underpaid relative to teammates suffer morale penalties, which can 
reduce performance by up to 8% and increase portal entry probability by up to 15%.
Page 18
8. Coaching System
College Basketball Coach Simulation — System Architecture
8.1 Coach Attribute Model
Attribute Range Primary Effect
OffensiveIQ
0-99
Offensive efficiency in sim, offensive scheme quality
DefensiveIQ 0-99
Defensive efficiency in sim, defensive scheme quality
DevelopmentSkill
0-99
Player growth multiplier (0.6x to 1.2x)
RecruitingSkill
0-99
Interest generation rate, scouting accuracy
Charisma
0-99
Visit boosts, media handling, decommit resistance
Discipline
0-99
Fewer off-court incidents, better academic performance
GameManagement
0-99
Timeout usage, lineup rotation, end-game decisions
Adaptability
0-99
In-game adjustment speed, ability to change schemes
Loyalty
0-99
Resistance to job-hopping, commitment to program
Ambition 0-99 Job-seeking behavior, NBA interest, willingness to leave
Ethics
8.2 Coaching Tree
0-99
Compliance with rules, tampering avoidance
Each AI coach has a CoachingTree linking them to a mentor. Coaches who share a tree tend to 
run similar schemes, have pipeline recruiting connections, and are more likely to hire each other 
as assistants. When a head coach is fired, their assistants scatter to other programs, carrying 
institutional knowledge and recruit relationships.
8.3 Firing Logic
HotSeatScore = (ExpectedWins - ActualWins) * 2 + TourneyDisappointment * 3 
+ ScandalPenalty + FanPressure
FiringProbability = sigmoid((HotSeatScore - FiringThreshold) / 3)
FiringThreshold varies by program expectations: blue bloods have a threshold of 8 (fired for 
modest underperformance), mid-majors have 15 (tolerate more losing). A coach with 
HotSeatScore 12 at a blue blood (threshold 8) has sigmoid((12-8)/3) = sigmoid(1.33) = 79% 
firing probability. The same score at a mid-major (threshold 15) yields sigmoid(-1.0) = 27%.
8.4 Hiring Logic
When a job opens, the simulation generates a candidate pool and scores each candidate:
HireScore = (0.25 * WinRecord) + (0.20 * RecruitingSkill) + (0.15 * 
Charisma) + (0.15 * SchemesFit) + (0.10 * Loyalty) + (0.10 * Prestige 
Match) + (0.05 * Cost)
Blue blood programs prioritize WinRecord and Charisma. Mid-majors prioritize Cost and 
RecruitingSkill. The AI athletic director for each program has biases that affect weights.
Page 19
8.5 Buyout Formula
College Basketball Coach Simulation — System Architecture
Buyout = AnnualSalary * RemainingYears * 0.70
Coaches on long contracts at high salaries create financial constraints for programs wanting to 
make a change. A coach making $4M/year with 5 years left costs $14M to fire, which reduces 
the BoosterBudget for 2-3 years.
Page 20
9. Playstyle System
College Basketball Coach Simulation — System Architecture
9.1 Scheme Definition
Each coach defines an offensive and defensive scheme using continuous sliders (0-100):
Slider
Low (0-30)
High (70-100)
Sim Effect
Pace
Slow, half-court
Fast, up-tempo
Possessions/game: 60-78
ThreePointEmphasis
Paint-focused
Perimeter-heavy
3PA rate: 20%-50%
PostUsage
No post play
Feed the post
Post possessions: 5%
35%
PressFrequency
No press
Full-court press
Turnover forcing +/- 
fatigue cost
ZoneVsMan
All man-to-man
All zone
Affects rebounding, 3PT 
defense
PickAndRoll
Isolation/motion
PnR heavy
PnR possessions: 10%
45%
TransitionPush
Always set up
Run and gun
Fast break rate: 10%-30%
DefensiveAggression
Pack the paint
Extend and deny
Steal rate vs open 3 rate
9.2 Playstyle-Player Fit
Each player has a FitScore for any given playstyle configuration:
FitScore = 100 - SUM(|PlayerTendency_i - SchemeRequirement_i| * 
Weight_i) / N
A stretch-5 (high ThreePoint, low PostMoves) in a PostUsage-heavy system has a poor 
FitScore. Players with FitScore below 50 suffer a -5% performance penalty in simulation. Above 
80, they get a +3% bonus. FitScore also affects morale: mismatched players lose 2 
morale/week.
9.3 Playstyle Impact on Recruiting
Recruits evaluate playstyle fit when choosing programs. A ball-dominant guard recruit strongly 
prefers programs with high Pace and low PostUsage. This creates strategic tension: changing 
your scheme to fit a star recruit may alienate existing players.
Page 21
College Basketball Coach Simulation — System Architecture
10. Game Simulation Engine
10.1 Architecture Overview
The game simulation engine operates on a possession-by-possession model. Each game 
simulates 130-160 possessions (65-80 per team) depending on pace. Every possession 
resolves through a decision tree that determines the action, shot quality, and outcome.
10.2 Possession Flow
Step 1: Determine possession type (transition or half-court) based on TransitionPush and 
turnover context. Step 2: Select primary action (PnR, post-up, isolation, motion, cut) based on 
scheme weights and personnel. Step 3: Determine ball-handler and action participants based 
on usage tendencies and lineup. Step 4: Calculate shot quality. Step 5: Determine outcome 
(made shot, missed shot, turnover, foul). Step 6: If missed, resolve rebound. Step 7: Update 
fatigue, fouls, and stats.
10.3 Shot Quality Formula
ShotQuality = BaseSkill + SpacingBonus + SchemeBonus - DefenseRating - 
FatiguePenalty + Randomness
BaseSkill = ShooterRelevantAttribute [CloseShot for rim, MidRange, or 
ThreePoint]
SpacingBonus = (TeamSpacingIndex - 50) * 0.15 [5 shooters = +7.5, no 
shooters = -7.5]
SchemeBonus = FitScore * 0.05 [max +5 for perfect scheme fit]
DefenseRating = ClosestDefenderAttribute * ContestFactor
FatiguePenalty = max(0, (MinutesPlayed - 30) * 0.8) [increases after 30 
minutes]
Randomness = NormalRandom(0, 8) [standard deviation of 8 rating points]
10.4 Shooting Probability
MakeProbability = BasePct * (1 + (ShotQuality - 50) * 0.008)
Where BasePct is the league average for that shot type: Close = 58%, MidRange = 40%, Three 
= 34%, FreeThrow = 72%. A ShotQuality of 80 yields: Close = 58% * (1 + 30*0.008) = 58% * 
1.24 = 71.9%. A ShotQuality of 30 yields: 58% * (1 - 20*0.008) = 58% * 0.84 = 48.7%.
10.5 Turnover Probability
TurnoverProb = BaseTurnover * (1 + PressAdjustment + DefIntensity - 
BallSecurity)
BaseTurnover = 0.14 per possession
PressAdjustment = OpponentPressFrequency * 0.003
DefIntensity = (OpponentDefAggression - 50) * 0.002
BallSecurity = (BallHandlerRating - 50) * 0.003
Page 22
10.6 Rebounding
College Basketball Coach Simulation — System Architecture
OffRebProb = (TeamOffReb_avg / (TeamOffReb_avg + OppDefReb_avg)) * 
ZoneBonus * Hustle
Zone defense gives a -8% offensive rebounding penalty (box-out advantage). Hustle is a small 
random factor based on team Competitiveness averages.
10.7 Home Court Advantage
HomeCourtBoost = BaseHCA + FanIntensityBonus + AltitudeBonus
BaseHCA = +3.5 to home team's overall effective rating
FanIntensityBonus = (FanInterest - 50) * 0.06 [range -3 to +3]
AltitudeBonus = AltitudeFactor for high-altitude venues (BYU, Air Force, 
etc.)
Total HCA ranges from +1 to +7 rating points, consistent with real-world research showing 
home court advantage in college basketball is worth approximately 3-4 points on the spread.
10.8 Clutch and Upset Mechanics
ClutchMultiplier = 1.0 + (ClutchRating - 50) * 0.005 [applied in final 5 
min if margin < 8]
UpsetBoost = max(0, (Underdog Competitiveness_avg - 60) * 0.3) [underdog 
gets boost from effort]
Combined with random variance, the engine produces upset rates of approximately 20-25% for 
5-vs-12 seed matchups, consistent with historical NCAA tournament data.
Page 23
11. Scheduling System
College Basketball Coach Simulation — System Architecture
11.1 Conference Schedule
Conference schedules are generated using a round-robin or partial round-robin format 
depending on conference size. Conferences with 14+ teams play 18-20 conference games with 
an unbalanced schedule. Rivalry games are always scheduled as home-and-away. The 
scheduling algorithm ensures every team plays every other team at least once, with travel
balanced home/away distribution.
11.2 Non-Conference Generation
Each team plays 10-13 non-conference games. The scheduling AI targets:
DesiredSOS = ConfAvgPrestige * 0.4 + TeamPrestige * 0.3 + AmbitionFactor * 
0.3
High-prestige programs schedule harder non-conference slates. Mid-majors balance between 
resume-building games (1-2 tough road games) and winnable home games. Multi-team events 
(MTE) are generated pre-season: 8-16 early-season tournaments with prestige tiers (e.g., Maui 
Invitational tier vs. low-major MTE).
11.3 Strength of Schedule Formula
SOS = (0.60 * AvgOpponentRating) + (0.25 * AvgOpponentWinPct) + (0.15 * 
AvgOppSOS)
This recursive formula stabilizes after 3-4 iterations and produces a 0-100 SOS score used for 
tournament selection.
11.4 Rivalry System
Each team has 1-3 designated rivals with Rivalry Intensity scores (0-100). Rivalry games get 
attendance bonuses (+10%), home court boost (+1.5), and media coverage multipliers. Rivalry 
intensity changes slowly based on competitive history, geographic proximity, and conference 
membership.
Page 24
12. Rankings & Metrics
College Basketball Coach Simulation — System Architecture
12.1 AP Poll Simulation
The simulated AP Poll uses a voter model with 65 simulated voters. Each voter evaluates teams 
using a weighted formula with individual voter bias:
VoterScore(team) = (0.30 * WinPct) + (0.25 * AdjEfficiency) + (0.20 * SOS) 
+ (0.15 * BestWins) + (0.10 * EyeTest) + VoterBias
VoterBias introduces regional and conference bias: each voter has a +/- 3 point bias toward 1-2 
conferences. 'EyeTest' is a composite of margin of victory, star player presence, and recent 
momentum. This produces realistic poll inertia (teams don't drop fast enough, preseason bias 
persists into November, etc.).
12.2 NET Rating Simulation
NET = (0.25 * TeamValue) + (0.25 * NetEfficiency) + (0.20 * 
WinPctVsQuadrants) + (0.15 * AdjWinPct) + (0.15 * ScoringMargin)
TeamValue is derived from game results weighted by opponent strength. NetEfficiency is 
adjusted offensive efficiency minus adjusted defensive efficiency. The Quad system classifies 
games by opponent NET rank and location.
12.3 KenPom-Style Efficiency
AdjOffEff = RawOffEff * (NationalAvgDefEff / OpponentAdjDefEff)
AdjDefEff = RawDefEff * (NationalAvgOffEff / OpponentAdjOffEff)
OverallRating = AdjOffEff - AdjDefEff
This produces a single efficiency margin number per team that correlates strongly with actual 
team quality. Typically ranges from -15 (worst teams) to +30 (elite teams).
12.4 Bracketology Engine
The selection committee AI evaluates teams using a holistic resume score:
ResumeScore = (0.25 * Q1Wins) + (0.20 * NET) + (0.15 * SOS) + (0.15 * 
Q1+Q2Record) + (0.10 * ConfRecord) + (0.10 * Last10) + (0.05 * 
BonusPoints)
BonusPoints include road wins, top-10 wins, and conference tournament performance. The top 
36 at-large teams are selected. Seeding follows S-curve placement with geographic 
considerations.
Page 25
13. Postseason System
College Basketball Coach Simulation — System Architecture
13.1 Conference Tournaments
Every conference holds a tournament in the final week of the season. Format varies by 
conference size (8-team single elimination, 12-team with byes, etc.). The tournament winner 
receives the automatic bid. Conference tournament performance is the last major data point for 
the selection committee.
13.2 NCAA Tournament Selection
The selection committee AI selects 68 teams: 32 auto-bids and 36 at-large. The Last Four In 
and First Four Out are explicitly tracked. Bubble teams are ranked by ResumeScore with a 
cutoff threshold that varies annually based on the strength of the at-large pool.
13.3 Seeding and Bracket Construction
Seeds 1-16 are assigned by S-curve (top 4 overall get #1 seeds, next 4 get #2, etc.). The 
bracket AI then applies constraints: teams from the same conference cannot meet before the 
Sweet 16 (or Elite 8 for large conferences), geographic proximity is considered for early rounds, 
and the top 4 overall seeds are placed in pods closest to their region.
13.4 Cinderella Probability
CinderellaFactor = (TeamChemistry * 0.25) + (BestPlayerClutch * 0.20) + 
(CoachTourneyExp * 0.15) + (DefensiveRating * 0.20) + (ScheduleTestedFlag 
* 0.10) + (Randomness * 0.10)
Mid-majors with elite defense, a clutch star, good chemistry, and a coach with tournament 
experience have elevated Cinderella factors. Combined with the inherent variance of the sim 
engine, this produces realistic upset rates: roughly 1-2 double-digit seeds reach the Sweet 16 
per tournament.
13.5 NIT and Other Tournaments
Teams that narrowly miss the NCAA tournament are invited to the NIT (32 teams), CBI (16 
teams), or CIT (16 teams). These tournaments offer prestige bonuses (+1-3), player 
development bonuses (extra games), and recruiting visibility for mid-majors.
Page 26
College Basketball Coach Simulation — System Architecture
14. Long-Term Dynasty System
14.1 Record Books
The simulation maintains comprehensive record books at the player, team, conference, and 
national level. Records tracked include: single-game records (points, assists, rebounds, blocks, 
steals, 3PM), single-season records, career records, team season records (wins, losses, margin 
of victory, efficiency), tournament records, coaching records, and recruiting class rankings.
14.2 Player Legacy Score
LegacyScore = (CareerPER * 0.20) + (AllAmericanSelections * 15) + 
(POYAwards * 25) + (TourneyPerformance * 0.15) + (NBADraftPosition * 0.10) 
+ (TeamWins * 0.05) + (ConferenceTitles * 5) + (NatChampionships * 20)
Players with LegacyScore above 85 are inducted into the program Hall of Fame. Above 95, they 
receive jersey retirement consideration (probability = (LegacyScore - 95) * 20%).
14.3 Blue Blood Evolution
Program classifications are recalculated every 5 years. A mid-major that sustains 
CurrentPrestige above 75 for 10+ years can rise to Elite status. A traditional blue blood that falls 
below 60 CurrentPrestige for 15+ years loses blue blood status. This creates organic narrative 
arcs where programs rise and fall across decades.
14.4 Dynamic Rule Changes
Every 5-10 years (randomized), the simulation introduces NCAA rule changes drawn from a 
probability pool. Examples include: shot clock changes (30 sec to 24 sec), transfer eligibility 
modifications, NIL regulation changes, scholarship limit changes, one-and-done rule elimination, 
conference tournament format changes, and academic eligibility threshold adjustments. Each 
rule change propagates through all affected systems.
14.5 NIL Inflation and Correction
NILInflationRate = 1.03 + (0.01 * CompetitivePressure) per year [3-4% 
annual growth]
CorrectionTrigger: if AvgNIL > 3 * BaselineNIL, RegulationEvent 
probability = 0.30/year
Over decades, NIL values inflate but are periodically corrected by regulation events that cap 
spending or introduce transparency requirements, keeping the economy stable.
Page 27
College Basketball Coach Simulation — System Architecture
15. Advanced Stats Engine
15.1 Player Efficiency Rating (PER-Style)
SimPER = (PTS + REB + AST + STL + BLK - (FGA-FGM) - (FTA-FTM) - TOV) * 
(1 / MinPlayed) * LeagueAdjust
Normalized so league average = 15.0. Elite players reach 28-35. This is the primary single
number measure of player contribution.
15.2 Box Plus/Minus (BPM)
BPM = OffBPM + DefBPM
OffBPM = (Usage * OffRtgAboveAvg * 0.2) + (AST% * 3) + (TOV% * -2) + (ORB% 
* 1.5)
DefBPM = (STL% * 2) + (BLK% * 1.5) + (DRB% * 1) + (DefRatingBelowAvg * 
0.2)
15.3 Lineup Synergy Rating
SynergyScore = BaseEfficiency + SpacingBonus + TempoMatch + 
DefComplementarity + ChemistryBonus
The engine tracks every 5-man lineup combination and evaluates how well players complement 
each other. A lineup of 5 ball-dominant guards has low synergy. A balanced lineup with a rim 
protector, two shooters, a playmaker, and a slasher has high synergy. The user can view lineup 
data to optimize rotations.
15.4 Win Shares
WinShares = (OffWS + DefWS) / 2
OffWS = (MarginalOffense / MarginalPtsPerWin)
DefWS = (MarginalDefense / MarginalPtsPerWin)
Credits wins proportionally to player contributions. Useful for evaluating role players who 
contribute in non-scoring ways.
Page 28
College Basketball Coach Simulation — System Architecture
16. AI Coach Decision Engine
16.1 Recruiting AI
CPU coaches target recruits using a needs-based evaluation system:
TargetPriority = (PositionNeed * 0.35) + (TalentGap * 0.30) + (SchemesFit 
* 0.20) + (Gettability * 0.15)
PositionNeed is high if the team loses starters at that position. TalentGap is the difference 
between the recruit's projected rating and the current roster average. SchemesFit evaluates 
how well the recruit matches the coach's playstyle. Gettability factors in prestige, NIL, 
geography, and existing interest. AI coaches with higher RecruitingSkill evaluate Gettability 
more accurately.
16.2 In-Game Adjustments
AI coaches evaluate game state every 4 minutes and can make adjustments:
If down by 10+: Increase pace, switch to zone, extend press frequency. If up by 10+: Slow pace, 
conservative defense, bench starters for rest. If opponent hitting 40%+ from three: Switch to 
man defense, extend perimeter defense. If foul trouble: Sub affected player, reduce defensive 
aggression. The quality of adjustments scales with the coach's Adaptability and 
GameManagement attributes. Low-rated coaches may make poor or delayed adjustments.
16.3 Portal Decisions
AI coaches evaluate portal players against their current roster:
PortalTargetValue = (PlayerRating - RosterPositionAvg) * NeedWeight + 
AgeFactor + ImmediateImpact
Coaches with high Ambition target high-impact portal players aggressively. Development
focused coaches prefer younger players with upside. Risk-averse coaches avoid players with 
character concerns.
16.4 Redshirt Decisions
RedshirtProb = sigmoid((RosterDepthAtPosition - 8) * 0.5 + (PlayerRating - 
RosterAvg) * -0.3 + FreshmanFactor)
Freshmen on deep rosters are likely to redshirt unless they're significantly better than the 
current depth. AI coaches with higher DevelopmentSkill redshirt more aggressively, recognizing 
the long-term value.
Page 29
17. Database Structure
College Basketball Coach Simulation — System Architecture
17.1 Core Tables
The simulation database uses a relational schema with the following primary tables. All IDs are 
64-bit integers. Timestamps use Unix epoch seconds.
Players Table
players (id, first_name, last_name, team_id, position, class_year, age, 
height, weight, wingspan,
  hometown_state, hometown_city, hs_star_rating, overall_rating, 
potential_rating, dev_curve_type,
  [18 skill attributes], [8 tendencies], [7 personality traits], [6 hidden 
attributes],
  nil_value, nil_contract_id, injury_status, academic_gpa, 
eligibility_years_remaining,
  redshirt_used, portal_status, draft_declaration, created_season, 
retired_season)
Teams Table
teams (id, name, mascot, conference_id, prestige_current, 
prestige_historical, facility_rating,
  nil_collective_strength, booster_budget, media_market, fan_intensity, 
arena_capacity,
  academic_rating, head_coach_id, [recruiting_region_ids], primary_color, 
secondary_color)
Conferences Table
conferences (id, name, prestige, media_deal_value, tournament_format, 
auto_bid_value,
  member_count, tier, founded_season, dissolved_season)
Coaches Table
coaches (id, first_name, last_name, team_id, age, [11 coaching 
attributes], salary,
  contract_years_remaining, career_wins, career_losses, 
tournament_appearances,
  final_fours, championships, coaching_tree_parent_id, scheme_offense, 
scheme_defense)
Game Logs Table
game_logs (id, season, week, home_team_id, away_team_id, home_score, 
away_score,
Page 30
College Basketball Coach Simulation — System Architecture
  home_off_eff, away_off_eff, home_def_eff, away_def_eff, pace, 
overtime_periods,
  attendance, is_conference, is_tournament, is_ncaa_tournament, 
neutral_site,
  [per-player stat lines as nested table])
Additional Tables
The schema also includes: recruits (pre-commitment recruit profiles), nil_contracts (active NIL 
deals), transfers (portal activity log), awards (annual award winners), rankings_history (weekly 
poll snapshots), season_records (team season summaries), draft_history (NBA draft results), 
coaching_changes (hiring/firing log), conference_membership_history (realignment tracking), 
sanctions (active penalties), and schedule (generated matchups with dates and locations).
Page 31
College Basketball Coach Simulation — System Architecture
18. Balance & Edge Case Handling
18.1 Anti-Dynasty Snowball Mechanisms
Several interlocking systems prevent any single program from dominating indefinitely:
Booster Fatigue reduces NIL spending after prolonged success. Roster Turnover from NBA 
draft declarations removes your best players. Increased Opponent Motivation (underdog boost 
scales with the dynasty's win streak). Coaching Poaching: successful assistants get hired away, 
weakening your staff. Complacency Factor: teams on long win streaks develop a hidden 
complacency modifier that slightly reduces effort in early-season games. Scheduling: dominant 
teams are targeted by mid-majors seeking resume wins, resulting in tougher schedules.
18.2 Mid-Major Viability
Small programs have several viable paths to competitiveness: Elite coaching hires (high 
Development + Recruiting coaches occasionally choose mid-majors for the challenge). 
Undervalued portal players (3-star recruits and portal players that AI blue bloods pass on). 
Home-court advantage multiplier for programs in hostile environments (small gyms with intense 
fans). Conference tournament auto-bids ensure any team can make the NCAA tournament. 
Cinderella Factor in the tournament gives well-coached defensive teams a realistic shot at 
upsets.
18.3 NIL Economic Stability
The NIL economy is bounded by: Booster Fatigue (Section 7.4), NIL Inflation Correction events 
(Section 14.5), a soft cap on individual player NIL deals (no player can receive more than 25% 
of the collective budget), and diminishing returns on NIL spending in recruiting (after a 
threshold, additional NIL money has logarithmic impact on recruit interest).
18.4 Realignment Safety Rails
Realignment events cannot: dissolve a conference below 6 members (triggers a merger event 
instead), move more than 4 teams in a single cycle, or create a conference larger than 20 
teams. If realignment would create orphaned teams, a safety algorithm forces them into the 
nearest viable conference by geography and prestige.
18.5 Simulation Health Checks
Every 5 simulated years, the engine runs diagnostic checks: Is prestige distribution healthy 
(standard deviation within expected range)? Are recruiting classes properly distributed across 
tiers? Is NIL spending within 2 standard deviations of baseline? Are win distributions following 
expected patterns? If any check fails, corrective adjustments are applied silently (e.g., boosting 
underperforming mid-major recruiting pipelines).
Page 32
College Basketball Coach Simulation — System Architecture
19. Optional Features & Events
19.1 Dynamic Event System
The simulation generates narrative events from a weighted probability pool each season. 
Events are categorized by type and rarity:
Event Category Examples Frequency Impact
Academic Scandal Grade fraud, fake classes, eligibility 
violations
2-3% per team/yr Scholarship 
reductions, 
postseason ban, 
prestige -10 to -20
FBI Investigation Booster payments, recruiting 
violations
0.5-1% per 
team/yr
Severe sanctions, 
coaching ban, 
recruiting penalty 2-3 
years
Player Drama Suspension, arrest, social media 
incident
5-8% per 
player/yr (scaled 
by Maturity)
1-10 game 
suspension, morale 
hit, media attention
Coaching Feud Public rivalry between coaches 1% per coach 
pair/yr
Recruiting competition 
bonus, rivalry intensity 
boost
Booster 
Interference
Booster demands playing time for 
funded player
3-5% at high-NIL 
programs
Morale disruption, 
potential coaching 
tension
Conference TV 
Deal
Major media rights renegotiation Every 5-8 years 
per conference
Revenue shifts, 
potential realignment 
trigger
Rule Change Shot clock, transfer rules, NIL 
regulations
Every 5-10 years System-wide formula 
adjustments
Facility Disaster Arena damage, construction delays 0.5% per team/yr Facility rating -5 to 
15, temporary home 
game relocation
19.2 Injury System
Players can suffer injuries during games and practices. Injury probability per game:
InjuryProb = BaseInjuryRate * InjuryProneness * FatigueMultiplier * 
PhysicalPlayMultiplier
BaseInjuryRate = 0.015 (1.5% per game)
Injury types include: minor (1-3 games), moderate (4-8 games), major (8-16+ games), and 
season-ending (ACL, Achilles). Severity is drawn from a weighted distribution. Players returning 
from major injuries have a -5 to -10 attribute penalty that recovers over 3-6 months.
19.3 Academic Eligibility
Page 33
College Basketball Coach Simulation — System Architecture
AcademicStandingProb = (AcademicRating * 0.40) + (Maturity * 0.25) + 
(Discipline * 0.20) + (InstitutionAcademicRating * 0.15)
Players with AcademicStanding below 2.0 GPA are ineligible. Each semester, GPA is 
recalculated. The coach's Discipline attribute and the school's Academic Rating both influence 
the probability of players maintaining eligibility. Academically at-risk players can be assigned 
tutors (costs resources, improves odds).
19.4 NBA Draft Logic
After each season, players evaluate whether to declare for the NBA draft:
DraftDeclarationProb = (ProjectedDraftPosition * 0.40) + (NILSatisfaction 
* -0.15) + (Age * 0.10) + (Ambition * 0.15) + (CoachInfluence * -0.10) + 
(LoyaltyAnchor * -0.10)
ProjectedDraftPosition is calculated from a mock draft engine that evaluates player ratings, 
measurables, age, and production against historical draft data. Projected lottery picks have 
>90% declaration probability. Projected second-rounders have 40-60%. Undrafted projections 
have <15%. Players can test the waters (enter and withdraw) based on feedback.
19.5 Redshirt System
Freshmen can be redshirted to preserve a year of eligibility. Redshirting players still practice 
and develop (at 70% of normal playing rate) but do not appear in games. The NCAA's 4-game 
redshirt rule is implemented: freshmen can play up to 4 games and still redshirt. This creates 
strategic decisions early in the season.
19.6 Sanctions System
Programs found in violation of NCAA rules receive sanctions scaled by severity:
Severity
Scholarship Reduction Postseason 
Ban
Recruiting Penalty
Prestige Hit
Minor
0-1 for 1 year
None
2 fewer visits for 1 year-3 to -5
Moderate
1-3 for 2 years
1 year
Reduced contact period 
2 years-8 to -12
Major
3-5 for 3 years
1-2 years
No official visits 2 years-15 to -25
Death Penalty Program shut down 1-2 
years
2+ years
Full recruiting ban-40 to -60
Sanctions trigger portal exits (see Section 6.1) and decommitments (see Section 5.7). Recovery 
from major sanctions takes 5-10 years of sustained rebuilding.
19.7 Media Narrative Engine
The game generates contextual media narratives based on simulation events: preseason 
predictions, weekly power rankings commentary, upset reactions, Cinderella stories, coaching 
hot seat articles, recruiting battle coverage, and dynasty retrospectives. These are generated 
from templates filled with simulation data, providing immersive context without requiring an 
external language model. Narratives affect public perception, which feeds back into poll voting 
bias and recruit interest.
Page 34
College Basketball Coach Simulation — System Architecture
Page 35
