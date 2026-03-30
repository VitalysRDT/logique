export interface Question {
  id: number;
  difficulty: number;
  category: string;
  type: "text" | "svg";
  text: string;
  choices: string[];
  correct_index: number;
  explanation: string;
  svg_config: SvgConfig | null;
  time_limit: number;
}

export interface SvgConfig {
  renderer: "PatternSequence" | "OddOneOut" | "GridLogic" | "BalanceScale";
  params: Record<string, unknown>;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  streak: number;
  connected: boolean;
  joinedAt: number;
}

export interface RoomState {
  roomCode: string;
  hostId: string;
  mode: "party" | "remote";
  status: "waiting" | "intro" | "playing" | "reveal" | "leaderboard" | "finished";
  currentQuestionIndex: number;
  questionIds: number[];
  totalQuestions: number;
  questionDeadline: number;
  questionStartedAt: number;
  timeLimitSeconds: number;
  maxPlayers: number;
  version: number;
}

export interface GameState {
  room: RoomState;
  players: Player[];
  scores: { playerId: string; score: number }[];
  currentQuestion?: QuestionForClient;
  nextQuestion?: QuestionForClient;
  revealData?: RevealData;
  answeredPlayerIds?: string[];
  readyPlayerIds?: string[];
}

export interface QuestionForClient {
  id: number;
  difficulty: number;
  category: string;
  type: "text" | "svg";
  text: string;
  choices: string[];
  svg_config: SvgConfig | null;
  time_limit: number;
}

export interface RevealData {
  correctIndex: number;
  explanation: string;
  playerResults: PlayerResult[];
}

export interface PlayerResult {
  playerId: string;
  playerName: string;
  chosenIndex: number | null;
  correct: boolean;
  pointsEarned: number;
  totalScore: number;
  previousRank: number;
  newRank: number;
}

export interface PlayerAnswer {
  optionId: number;
  answeredAt: number;
}
