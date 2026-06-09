import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface PredictionRecord {
    pred: string;
    actual: number;
    actualType: string;
    win: boolean;
    conf: number;
    time: string;
}

export const HydraKing = () => {
    // Header Status
    const [statusText, setStatusText] = useState('Connecting...');
    const [statusActive, setStatusActive] = useState(false);
    const [countdown, setCountdown] = useState('60s');
    const [lastUpdate, setLastUpdate] = useState('Never');

    // Current Prediction
    const [prediction, setPrediction] = useState<{
        prediction: string;
        confidence: number;
        reason: string;
        numbers: number[];
        models: string;
        streak: number;
        chop: number;
        consecutiveLosses: number;
        isDefense: boolean;
    } | null>(null);

    // Stats
    const [accuracy, setAccuracy] = useState('0%');
    const [winLossText, setWinLossText] = useState('0/0');
    const [maxWinStreak, setMaxWinStreak] = useState(0);
    const [maxLossStreak, setMaxLossStreak] = useState(0);

    // Recent drawn numbers (last 24)
    const [recentResults, setRecentResults] = useState<number[]>([]);

    // History logs
    const [predictionLogs, setPredictionLogs] = useState<PredictionRecord[]>([]);

    const gameIssuesRef = useRef<string[]>([]);
    const gameHistoryRef = useRef<number[]>([]);
    const lastPredictionRef = useRef<any>(null);
    const statsRef = useRef({
        total: 0, win: 0, loss: 0,
        maxWinStreak: 0, maxLossStreak: 0,
        current: 0, type: null as 'win' | 'loss' | null
    });

    const evaluatePrediction = (actual: number) => {
        const lastPred = lastPredictionRef.current;
        if (!lastPred || lastPred.prediction === 'WAIT' || lastPred.reason === 'Warming up...') return;

        const actualType = actual >= 5 ? 'BIG' : 'SMALL';
        const win = actualType === lastPred.prediction;

        statsRef.current.total++;

        if (win) {
            statsRef.current.win++;
            statsRef.current.current = statsRef.current.type === 'win' ? statsRef.current.current + 1 : 1;
            statsRef.current.type = 'win';
            statsRef.current.maxWinStreak = Math.max(statsRef.current.maxWinStreak, statsRef.current.current);
        } else {
            statsRef.current.loss++;
            statsRef.current.current = statsRef.current.type === 'loss' ? statsRef.current.current + 1 : 1;
            statsRef.current.type = 'loss';
            statsRef.current.maxLossStreak = Math.max(statsRef.current.maxLossStreak, statsRef.current.current);
        }

        // Update stats
        const winVal = statsRef.current.win;
        const lossVal = statsRef.current.loss;
        const tot = statsRef.current.total;
        setAccuracy(tot > 0 ? `${((winVal / tot) * 100).toFixed(1)}%` : '0%');
        setWinLossText(`${winVal}/${lossVal}`);
        setMaxWinStreak(statsRef.current.maxWinStreak);
        setMaxLossStreak(statsRef.current.maxLossStreak);

        // Add to list
        const newRecord: PredictionRecord = {
            pred: lastPred.prediction,
            actual,
            actualType,
            win,
            conf: lastPred.confidence,
            time: new Date().toLocaleTimeString()
        };
        setPredictionLogs(prev => [newRecord, ...prev.slice(0, 39)]);

        // Alert
        if (lastPred.confidence >= 65 && !lastPred.isDefense) {
            toast(`🌙 ${lastPred.prediction} is looking good! (${lastPred.confidence}%)`, {
                description: 'Clear signal detected.',
            });
        }
    };

    const fetchHistoryData = async () => {
        try {
            const res = await fetch(`https://lluui.vercel.app/api/predict?page=5`);
            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const latestDrawIssue = data.serverPeriodStr;
            const drawNum = data.resultNum;
            const list = data.list || [];

            let apiIssues = list.map((item: any) => item.issueNumber).reverse();
            let apiHistory = list.map((item: any) => parseInt(item.number)).reverse();

            if (gameIssuesRef.current.length === 0) {
                gameIssuesRef.current = apiIssues;
                gameHistoryRef.current = apiHistory;
            } else {
                const lastKnownIssue = gameIssuesRef.current[gameIssuesRef.current.length - 1];
                let newDraws: { issue: string; num: number }[] = [];

                const apiList = list.map((item: any) => ({
                    issue: item.issueNumber,
                    num: parseInt(item.number)
                })).reverse();

                let lastIdx = apiList.findIndex((i: any) => i.issue === lastKnownIssue);
                if (lastIdx !== -1 && lastIdx < apiList.length - 1) {
                    newDraws = apiList.slice(lastIdx + 1);
                } else if (lastIdx === -1) {
                    let newestApi = apiList[apiList.length - 1];
                    if (newestApi.issue !== lastKnownIssue) newDraws = [newestApi];
                }

                for (let draw of newDraws) {
                    evaluatePrediction(draw.num);
                    gameIssuesRef.current.push(draw.issue);
                    gameHistoryRef.current.push(draw.num);
                }
            }

            // Keep array neat
            if (gameHistoryRef.current.length > 500) {
                gameHistoryRef.current = gameHistoryRef.current.slice(-500);
                gameIssuesRef.current = gameIssuesRef.current.slice(-500);
            }

            // Update recent results bubbles (last 24)
            setRecentResults(gameHistoryRef.current.slice(-24));

            // Set current prediction
            const nextPred = {
                prediction: data.prediction,
                confidence: data.confidence,
                reason: data.reason,
                numbers: data.numbers,
                models: data.models,
                streak: data.streak,
                chop: data.chop,
                consecutiveLosses: data.consecutiveLosses,
                isDefense: data.isDefense
            };
            setPrediction(nextPred);
            lastPredictionRef.current = nextPred;

            setStatusText('Live');
            setStatusActive(true);
            setLastUpdate(new Date().toLocaleTimeString());

        } catch (error) {
            setStatusText('Network Error');
            setStatusActive(false);
        }
    };

    useEffect(() => {
        fetchHistoryData();

        // 4-second polling loop
        const poll = setInterval(fetchHistoryData, 4000);

        // Countdown timer loop
        const timer = setInterval(() => {
            const now = new Date();
            const sec = 60 - now.getSeconds();
            setCountdown(`${sec === 60 ? 60 : sec}s`);
        }, 1000);

        return () => {
            clearInterval(poll);
            clearInterval(timer);
        };
    }, []);

    // Confidence-based background gradients
    const getConfidenceClass = () => {
        if (!prediction) return 'from-slate-600 to-slate-500 shadow-slate-900/40';
        if (prediction.isDefense) return 'from-rose-800 to-red-600 border-rose-300 border-2 border-dashed animate-pulse shadow-rose-900/40';
        if (prediction.confidence >= 75) return 'from-emerald-700 to-teal-500 shadow-emerald-950/40';
        if (prediction.confidence >= 60) return 'from-amber-600 to-yellow-500 shadow-amber-950/40';
        return 'from-[#9333ea] to-[#d946ef] shadow-purple-950/40';
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 space-y-4 text-[#e9d5ff] font-sans pb-16 min-h-screen" style={{
            backgroundImage: 'radial-gradient(circle at top right, #241142 0%, #0f081c 60%)'
        }}>
            {/* Header Panel */}
            <Card className="bg-[#1a102e] border-2 border-[#3b2359] rounded-3xl p-5 shadow-2xl space-y-4">
                <h1 className="text-center text-2xl font-black text-[#d8b4fe] tracking-wide drop-shadow-[0_0_10px_rgba(216,180,254,0.3)]">
                    ✨ WinGo AI (HYDRA KING)
                </h1>
                
                {/* Status Row */}
                <div className="flex justify-center gap-3 flex-wrap text-xs font-bold font-mono">
                    <div className="flex items-center gap-2 bg-[#271644] border border-[#4c287f] py-1.5 px-3 rounded-full text-[#c084fc]">
                        <span className={`h-2.5 w-2.5 rounded-full ${statusActive ? 'bg-[#34d399] shadow-[0_0_8px_#34d399]' : 'bg-[#fb7185] shadow-[0_0_8px_#fb7185]'}`} />
                        {statusText}
                    </div>
                    <div className="flex items-center gap-2 bg-[#271644] border border-[#4c287f] py-1.5 px-3 rounded-full text-[#f472b6]">
                        ⏳ {countdown}
                    </div>
                    <div className="flex items-center gap-2 bg-[#271644] border border-[#4c287f] py-1.5 px-3 rounded-full text-zinc-500">
                        🌙 {lastUpdate}
                    </div>
                </div>
            </Card>

            {/* Split Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column */}
                <div className="space-y-4">
                    {/* Prediction Card */}
                    <Card className="bg-[#1a102e] border border-[#3b2359] rounded-3xl p-5 shadow-xl space-y-4">
                        <h2 className="text-xs uppercase font-black tracking-wider text-[#d8b4fe] border-b border-dashed border-[#4c287f] pb-2">
                            🔮 Next Prediction
                        </h2>

                        {!prediction || prediction.prediction === 'WAIT' ? (
                            <div className="bg-[#271644] border border-dashed border-[#4c287f] rounded-2xl p-6 text-center text-[#d8b4fe] space-y-2">
                                <span className="text-[10px] uppercase font-bold tracking-widest block opacity-75">Waiting</span>
                                <h3 className="text-4xl font-extrabold text-[#e9d5ff]">--</h3>
                                <div className="text-xs bg-[#3b2359] inline-block px-3 py-1 rounded-full text-white font-mono">0% CONF</div>
                                <p className="text-xs font-mono text-[#c084fc] pt-2">{prediction ? prediction.reason : 'Analyzing baseline pattern...'}</p>
                            </div>
                        ) : (
                            <div className={`bg-gradient-to-br ${getConfidenceClass()} rounded-2xl p-5 text-center text-white space-y-3 shadow-lg transition-all duration-300`}>
                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-85 block">✨ PREDICTION ✨</span>
                                <h3 className="text-5xl font-black tracking-wider drop-shadow-md">{prediction.prediction}</h3>
                                <div className="text-[11px] font-black bg-black/25 inline-block px-4 py-1.5 rounded-full tracking-wide">
                                    {prediction.confidence}% CONFIDENCE
                                </div>
                                <p className="text-xs font-bold font-mono bg-black/15 py-2 px-3 rounded-xl">{prediction.reason}</p>
                                
                                {/* Target prediction number circles */}
                                <div className="flex justify-center gap-1.5 pt-2">
                                    {prediction.numbers.map((n, idx) => {
                                        const type = n >= 5 ? 'bg-pink-500' : 'bg-sky-500';
                                        const isViolet = [0, 5].includes(n);
                                        return (
                                            <div
                                                key={idx}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md border ${
                                                    isViolet ? 'border-purple-300 bg-purple-700' : 'border-transparent'
                                                } ${type}`}
                                            >
                                                {n}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* AI Brain Panel */}
                    <Card className="bg-[#1a102e] border border-[#3b2359] rounded-3xl p-5 shadow-xl space-y-4">
                        <h2 className="text-xs uppercase font-black tracking-wider text-[#d8b4fe] border-b border-dashed border-[#4c287f] pb-2">
                            🧠 AI Brain Matrix
                        </h2>

                        {!prediction ? (
                            <div className="py-8 text-center text-xs text-[#c084fc] italic">Analyzing pattern weights... 🧸</div>
                        ) : (
                            <div className="bg-[#1d1033] border border-dashed border-[#6b21a8] rounded-2xl p-4 font-bold text-xs space-y-2 text-[#e9d5ff]">
                                <div className="flex justify-between border-b border-[#3b2359] pb-2">
                                    <span>🔥 Streak:</span>
                                    <span className="text-pink-400 font-extrabold">{prediction.streak} Draws</span>
                                </div>
                                <div className="flex justify-between border-b border-[#3b2359] pb-2">
                                    <span>🌊 Chop:</span>
                                    <span className="text-pink-400 font-extrabold">{prediction.chop} Alternations</span>
                                </div>
                                <div className="flex justify-between border-b border-[#3b2359] pb-2">
                                    <span>⚠️ Misses:</span>
                                    <span className={`font-extrabold ${prediction.consecutiveLosses > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {prediction.consecutiveLosses}
                                    </span>
                                </div>
                                <div className="flex justify-between pb-1">
                                    <span>🧠 Model:</span>
                                    <span className="text-pink-400 font-extrabold">{prediction.models}</span>
                                </div>

                                {prediction.isDefense ? (
                                    <div className="text-rose-400 text-center font-black bg-rose-500/10 py-2.5 px-4 rounded-xl border border-rose-500 animate-pulse mt-2 uppercase tracking-wide">
                                        🛡️ CHILL MODE: PAUSE BETTING
                                    </div>
                                ) : (
                                    <div className="text-emerald-400 text-center font-black bg-emerald-500/10 py-2.5 px-4 rounded-xl border border-emerald-500 mt-2 uppercase tracking-wide">
                                        ✅ CLEAR SIGNAL: Safe to Play
                                    </div>
                                )}
                            </div>
                        )}
                    </Card>

                    {/* Stats Dashboard */}
                    <Card className="bg-[#1a102e] border border-[#3b2359] rounded-3xl p-5 shadow-xl space-y-4">
                        <h2 className="text-xs uppercase font-black tracking-wider text-[#d8b4fe] border-b border-dashed border-[#4c287f] pb-2">
                            📊 Session Stats
                        </h2>

                        <div className="grid grid-cols-2 gap-3.5 text-center text-xs">
                            <div className="bg-[#25143d] border border-[#4c287f] p-3 rounded-2xl">
                                <span className="text-[10px] text-[#c084fc] font-bold uppercase tracking-wider block">Accuracy</span>
                                <div className="text-xl font-black mt-1 text-white">{accuracy}</div>
                            </div>
                            <div className="bg-[#25143d] border border-[#4c287f] p-3 rounded-2xl">
                                <span className="text-[10px] text-[#c084fc] font-bold uppercase tracking-wider block">Win/Loss</span>
                                <div className="text-xl font-black mt-1 text-white">{winLossText}</div>
                            </div>
                            <div className="bg-[#25143d] border border-[#4c287f] p-3 rounded-2xl">
                                <span className="text-[10px] text-[#c084fc] font-bold uppercase tracking-wider block">Win Streak</span>
                                <div className="text-xl font-black mt-1 text-emerald-400">{maxWinStreak}</div>
                            </div>
                            <div className="bg-[#25143d] border border-[#4c287f] p-3 rounded-2xl">
                                <span className="text-[10px] text-[#c084fc] font-bold uppercase tracking-wider block">Loss Streak</span>
                                <div className="text-xl font-black mt-1 text-rose-500">{maxLossStreak}</div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Recent Results Grid (Bubble format) */}
                    <Card className="bg-[#1a102e] border border-[#3b2359] rounded-3xl p-5 shadow-xl space-y-4">
                        <h2 className="text-xs uppercase font-black tracking-wider text-[#d8b4fe] border-b border-dashed border-[#4c287f] pb-2">
                            📜 Recent Results
                        </h2>

                        <div className="flex flex-wrap gap-2.5 justify-start">
                            {recentResults.map((num, idx) => {
                                const sizeColor = num >= 5 ? 'bg-pink-500 shadow-pink-500/20' : 'bg-sky-500 shadow-sky-500/20';
                                const isViolet = [0, 5].includes(num);
                                return (
                                    <div
                                        key={idx}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-white shadow-md border ${
                                            isViolet ? 'border-purple-300 bg-purple-700' : 'border-transparent'
                                        } ${sizeColor}`}
                                    >
                                        {num}
                                    </div>
                                );
                            })}
                            {recentResults.length === 0 && (
                                <div className="w-full text-center py-10 text-zinc-700 italic">No draws mapped yet.</div>
                            )}
                        </div>
                    </Card>

                    {/* Historical logs */}
                    <Card className="bg-[#1a102e] border border-[#3b2359] rounded-3xl p-5 shadow-xl space-y-4 overflow-hidden">
                        <h2 className="text-xs uppercase font-black tracking-wider text-[#d8b4fe] border-b border-dashed border-[#4c287f] pb-2">
                            📋 Prediction History
                        </h2>

                        <div className="max-h-80 overflow-y-auto space-y-2.5 pr-1">
                            {predictionLogs.map((log, idx) => (
                                <div 
                                    key={idx} 
                                    className={`bg-[#211338] border rounded-2xl p-3 flex justify-between items-center text-xs font-bold border-l-4 ${
                                        log.win 
                                            ? 'border-emerald-500 border-emerald-500/20 bg-emerald-500/5' 
                                            : 'border-rose-500 border-rose-500/20 bg-rose-500/5'
                                    }`}
                                >
                                    <div>
                                        <div className="text-white text-sm font-extrabold">{log.pred}</div>
                                        <span className="text-[10px] text-[#c084fc] font-mono">{log.conf}% Conf</span>
                                    </div>
                                    <div className="text-xl font-black text-white">{log.actual}</div>
                                    <span className={`py-1 px-3.5 rounded-full text-[9px] font-black uppercase text-white shadow-sm ${
                                        log.win ? 'bg-[#10b981] shadow-emerald-500/30' : 'bg-[#f43f5e] shadow-rose-500/30'
                                    }`}>
                                        {log.win ? 'WIN 🎉' : 'LOSS 💔'}
                                    </span>
                                </div>
                            ))}
                            {predictionLogs.length === 0 && (
                                <div className="text-center py-14 text-zinc-700 italic">No predictions simulated yet.</div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
