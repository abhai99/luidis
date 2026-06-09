import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface HistoryRow {
    issue: string;
    pts: string;
    pred: string;
    res: string;
    stat: string;
}

export const EightVoteAI = () => {
    // Settings & State
    const [isSkipMode, setIsSkipMode] = useState<boolean>(() => localStorage.getItem('isSkipMode') !== 'false');
    const [isInverseMode, setIsInverseMode] = useState<boolean>(() => localStorage.getItem('isInverseMode') !== 'false');
    const [soundEnabled, setSoundEnabled] = useState(false);
    
    // UI state
    const [timerText, setTimerText] = useState('00s');
    const [targetIssue, setTargetIssue] = useState('-----');
    const [statusText, setStatusText] = useState('CONNECTING TO API...');
    const [statusClass, setStatusClass] = useState('bg-zinc-800 text-zinc-400 border border-zinc-700');
    const [predictionVal, setPredictionVal] = useState('WAITING...');
    const [panelBorderColor, setPanelBorderColor] = useState('border-zinc-800');
    const [panelBgColor, setPanelBgColor] = useState('bg-zinc-950');

    // Stats
    const [winsCount, setWinsCount] = useState(0);
    const [lossesCount, setLossesCount] = useState(0);
    const [winRate, setWinRate] = useState('0%');
    const [maxW, setMaxW] = useState(0);
    const [maxL, setMaxL] = useState(0);
    const [activeLink, setActiveLink] = useState('0 Active');

    // Engine LED list
    const [engines, setEngines] = useState<{ val: string; w: number }[]>([]);

    // History Table Rows
    const [history, setHistory] = useState<HistoryRow[]>([]);

    // Tracking refs
    const lastKnownPeriodRef = useRef('0');
    const activePredictionRef = useRef<{ issue: string; target: string; voteStr: string } | null>(null);
    const statsRef = useRef({ w: 0, l: 0, cw: 0, mw: 0, cl: 0, ml: 0 });

    const handlePlayBeep = (silent = false) => {
        if (!soundEnabled && !silent) return;
        try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            if (silent) {
                const osc = ctx.createOscillator();
                osc.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 0.01);
                return;
            }
            for (let i = 0; i < 2; i++) {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.frequency.value = 950;
                    osc.type = "sine";
                    gain.gain.setValueAtTime(0.5, ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
                    osc.start(ctx.currentTime);
                    osc.stop(ctx.currentTime + 0.1);
                }, i * 150);
            }
        } catch (e) {}
    };

    const fetchPrediction = async (isInitial = false) => {
        try {
            const res = await fetch(`/api/predict?page=1`);
            if (!res.ok) throw new Error('API request failed');
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const serverPeriodStr = data.serverPeriodStr;
            const shortIssue = serverPeriodStr.slice(-5);
            const actualNum = data.resultNum;
            const actualOutcome = data.outcome; // "Big" or "Small"
            const actualSizeSymbol = actualOutcome === 'Big' ? 'B' : 'S';

            if (serverPeriodStr === lastKnownPeriodRef.current) return;

            // Update stats logic for previous prediction
            const prevPred = activePredictionRef.current;
            if (!isInitial && prevPred && prevPred.issue === shortIssue) {
                const p = prevPred.target;
                let statText = "SKIPPED";

                if (p !== "SKIP") {
                    if (p.toLowerCase() === actualOutcome.toLowerCase()) {
                        statsRef.current.w++;
                        statsRef.current.cw++;
                        statsRef.current.cl = 0;
                        if (statsRef.current.cw > statsRef.current.mw) {
                            statsRef.current.mw = statsRef.current.cw;
                        }
                        statText = "WIN";
                    } else {
                        statsRef.current.l++;
                        statsRef.current.cl++;
                        statsRef.current.cw = 0;
                        if (statsRef.current.cl > statsRef.current.ml) {
                            statsRef.current.ml = statsRef.current.cl;
                        }
                        statText = "LOSS";
                    }
                }

                // Add Row
                const newRow: HistoryRow = {
                    issue: shortIssue,
                    pts: prevPred.voteStr,
                    pred: p,
                    res: actualOutcome,
                    stat: statText
                };
                setHistory(prev => [newRow, ...prev.slice(0, 49)]);
            } else if (!isInitial && !prevPred) {
                const newRow: HistoryRow = {
                    issue: shortIssue,
                    pts: "--",
                    pred: "SKIP",
                    res: actualOutcome,
                    stat: "SKIPPED"
                };
                setHistory(prev => [newRow, ...prev.slice(0, 49)]);
            }

            // Save stats state
            setWinsCount(statsRef.current.w);
            setLossesCount(statsRef.current.l);
            setMaxW(statsRef.current.mw);
            setMaxL(statsRef.current.ml);
            const total = statsRef.current.w + statsRef.current.l;
            setWinRate(total === 0 ? '0%' : `${Math.round((statsRef.current.w / total) * 100)}%`);

            // Save current period ref
            lastKnownPeriodRef.current = serverPeriodStr;

            // Set dynamic engines state
            setEngines(data.engRes);
            const activeCount = data.engRes.filter((e: any) => e.w > 0).length;
            setActiveLink(`${activeCount} Active`);

            // Apply skips & inversions client-side
            const nextIssue = String(BigInt(serverPeriodStr) + 1n).slice(-5);
            const votes = { B: data.votesB, S: data.votesS };
            const threshold = data.activeWeightSum * 0.6;

            let crowdConsensus = "SKIP";
            if (isSkipMode) {
                if (votes.B >= threshold) crowdConsensus = "Big";
                else if (votes.S >= threshold) crowdConsensus = "Small";
            } else {
                if (votes.B > votes.S) crowdConsensus = "Big";
                else crowdConsensus = "Small";
            }

            let finalPred = "SKIP";
            let msg = "";
            let pBorder = "border-zinc-800";
            let pBg = "bg-zinc-950";
            let sClass = "border-zinc-800 text-zinc-500 bg-zinc-900/40";

            if (crowdConsensus !== "SKIP") {
                if (isInverseMode) {
                    finalPred = crowdConsensus === "Big" ? "Small" : "Big";
                    msg = `⚡ INVERTED NEURAL NET! Bet ${finalPred.toUpperCase()}`;
                    pBorder = "border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.15)]";
                    pBg = "bg-pink-950/5";
                    sClass = "border-pink-500/30 text-pink-400 bg-pink-500/10 animate-pulse";
                } else {
                    finalPred = crowdConsensus;
                    msg = `✅ FOLLOWING NEURAL NET! Bet ${finalPred.toUpperCase()}`;
                    pBorder = "border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]";
                    pBg = "bg-cyan-950/5";
                    sClass = "border-cyan-500/30 text-cyan-400 bg-cyan-500/10 animate-pulse";
                }
            } else {
                msg = `NEURAL CONFLICT. SKIPPING. B:${votes.B} S:${votes.S}`;
            }

            setTargetIssue(nextIssue);
            setPredictionVal(finalPred === "SKIP" ? "DO NOT BET" : finalPred);
            setStatusText(msg);
            setStatusClass(sClass);
            setPanelBorderColor(pBorder);
            setPanelBgColor(pBg);

            activePredictionRef.current = {
                issue: nextIssue,
                target: finalPred,
                voteStr: `${votes.B} - ${votes.S}`
            };

            if (!isInitial && finalPred !== "SKIP") {
                handlePlayBeep();
            }

        } catch (error) {
            setStatusText("⚠️ API SYNC CONNECTION ERROR");
            setStatusClass("border-red-500/30 text-red-400 bg-red-500/10");
        }
    };

    const toggleSound = () => {
        setSoundEnabled(prev => {
            const next = !prev;
            if (next) handlePlayBeep(true);
            return next;
        });
    };

    const handleSetMode = (safe: boolean) => {
        setIsSkipMode(safe);
        localStorage.setItem('isSkipMode', String(safe));
        resetBrain();
    };

    const handleSetInverse = (inv: boolean) => {
        setIsInverseMode(inv);
        localStorage.setItem('isInverseMode', String(inv));
        resetBrain();
    };

    const resetBrain = () => {
        statsRef.current = { w: 0, l: 0, cw: 0, mw: 0, cl: 0, ml: 0 };
        setWinsCount(0);
        setLossesCount(0);
        setMaxW(0);
        setMaxL(0);
        setWinRate('0%');
        setHistory([]);
        fetchPrediction(true);
    };

    useEffect(() => {
        // Initial setup and fetch
        fetchPrediction(true);

        const clockInterval = setInterval(() => {
            const sec = new Date().getSeconds();
            const rem = sec < 30 ? 30 - sec : 60 - sec;
            setTimerText(`${String(rem).padStart(2, '0')}s`);

            // Fetch exactly at 01 and 31 seconds
            if (sec === 1 || sec === 31) {
                fetchPrediction();
            }
        }, 1000);

        return () => clearInterval(clockInterval);
    }, [isSkipMode, isInverseMode]);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-5 animate-fade-in text-white font-sans pb-12">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
                <h2 className="text-sm font-extrabold tracking-widest text-zinc-100 flex items-center gap-2 uppercase">
                    <span className={`h-2.5 w-2.5 rounded-full animate-ping ${isInverseMode ? 'bg-pink-500 shadow-[0_0_10px_#ec4899]' : 'bg-cyan-500 shadow-[0_0_10px_#06b6d4]'}`} />
                    Liquid Neural V6.0
                </h2>
                <Button
                    onClick={toggleSound}
                    variant="outline"
                    className={`text-xs font-bold border-zinc-800 ${soundEnabled ? 'text-green-400 border-green-500/30 bg-green-500/5' : 'text-zinc-500'}`}
                >
                    {soundEnabled ? '🔊 Sound On' : '🔇 Sound Off'}
                </Button>
            </div>

            {/* Toggle Toggles */}
            <div className="space-y-2">
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleSetMode(true)}
                        className={`flex-1 h-9 text-[11px] font-black rounded-lg ${isSkipMode ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-950 border border-zinc-800 text-zinc-500'}`}
                    >
                        🛡️ SAFE (Skip)
                    </Button>
                    <Button
                        onClick={() => handleSetMode(false)}
                        className={`flex-1 h-9 text-[11px] font-black rounded-lg ${!isSkipMode ? 'bg-red-500/10 text-red-400 border border-red-500/30' : 'bg-zinc-950 border border-zinc-800 text-zinc-500'}`}
                    >
                        🚀 ACTION (No Skip)
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => handleSetInverse(true)}
                        className={`flex-1 h-9 text-[11px] font-black rounded-lg ${isInverseMode ? 'bg-pink-500/10 text-pink-400 border border-pink-500/30' : 'bg-zinc-950 border border-zinc-800 text-zinc-500'}`}
                    >
                        ⚡ INVERSE ON
                    </Button>
                    <Button
                        onClick={() => handleSetInverse(false)}
                        className={`flex-1 h-9 text-[11px] font-black rounded-lg ${!isInverseMode ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-zinc-950 border border-zinc-800 text-zinc-500'}`}
                    >
                        ✅ INVERSE OFF
                    </Button>
                </div>
            </div>

            {/* Target timer bar */}
            <div className="flex justify-between items-center bg-zinc-950 p-3.5 border border-zinc-900 rounded-xl">
                <div className="text-left">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Target Issue</span>
                    <div className="text-sm font-extrabold text-white mt-0.5">{targetIssue}</div>
                </div>
                <div className="text-3xl font-black text-cyan-400 tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">
                    {timerText}
                </div>
            </div>

            {/* Neural Net Matrix Panel */}
            <Card className={`p-5 text-center border-2 rounded-2xl ${panelBorderColor} ${panelBgColor} space-y-4 shadow-xl transition-all duration-300`}>
                <div className="text-[10px] text-zinc-500 font-extrabold uppercase tracking-widest">Neural Weighted Vote Array</div>
                
                {/* 85 LED Matrix Grid */}
                <div className="grid gap-0.5 bg-black/60 p-2.5 rounded-lg border border-zinc-900" style={{ gridTemplateColumns: 'repeat(17, minmax(0, 1fr))' }}>
                    {Array.from({ length: 85 }).map((_, idx) => {
                        const eng = engines[idx];
                        let ledClass = "bg-zinc-800/20 opacity-20";
                        if (eng && eng.w > 0) {
                            ledClass = eng.val === 'B' 
                                ? 'bg-amber-500 opacity-100 shadow-[0_0_5px_#f59e0b]' 
                                : 'bg-blue-500 opacity-100 shadow-[0_0_5px_#3b82f6]';
                        }
                        return (
                            <div
                                key={idx}
                                className={`h-2 rounded-sm transition-all duration-300 ${ledClass}`}
                            />
                        );
                    })}
                </div>

                <div className="space-y-1">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Dynamic System Order</div>
                    <div className={`text-4xl font-black uppercase tracking-wide ${
                        predictionVal === 'Big' ? 'text-amber-500 drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]' :
                        predictionVal === 'Small' ? 'text-blue-500 drop-shadow-[0_2px_8px_rgba(59,130,246,0.4)]' :
                        'text-zinc-600'
                    }`}>
                        {predictionVal}
                    </div>
                </div>

                {/* Status Badge message */}
                <div className={`inline-block py-1.5 px-4 rounded-full text-xs font-bold tracking-wide border ${statusClass}`}>
                    {statusText}
                </div>
            </Card>

            {/* Session Stats Grid */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-xl relative">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Win Rate</div>
                    <span className="text-lg font-black text-cyan-400 block mt-0.5">{winRate}</span>
                    <div className="absolute top-1 right-2 text-[8px] border border-cyan-500/30 text-cyan-400 bg-cyan-500/5 px-1 rounded">
                        {activeLink}
                    </div>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Total Wins</div>
                    <span className="text-lg font-black text-emerald-400 block mt-0.5">{winsCount}</span>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Max Win Streak</div>
                    <span className="text-lg font-black text-emerald-400 block mt-0.5">{maxW}</span>
                </div>
                <div className="bg-zinc-950 p-3 border border-zinc-900 rounded-xl">
                    <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Max Loss Streak</div>
                    <span className="text-lg font-black text-red-400 block mt-0.5">{maxL}</span>
                </div>
            </div>

            {/* Log History */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-xl overflow-hidden shadow-xl">
                <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr className="bg-zinc-900 text-zinc-500 text-[9px] font-bold uppercase tracking-widest sticky top-0 border-b border-zinc-800">
                                <th className="py-2">Issue</th>
                                <th className="py-2">Neural Pts</th>
                                <th className="py-2">Bet</th>
                                <th className="py-2">Result</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                            {history.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-900/35">
                                    <td className="py-2.5 font-bold text-zinc-400">{row.issue}</td>
                                    <td className="py-2.5 text-[10px] text-zinc-600 font-mono">{row.pts} pts</td>
                                    <td className={`py-2.5 font-bold uppercase ${
                                        row.pred === 'Big' ? 'text-amber-500' : row.pred === 'Small' ? 'text-blue-500' : 'text-zinc-600'
                                    }`}>
                                        {row.pred === 'SKIP' ? '-' : row.pred}
                                    </td>
                                    <td className={`py-2.5 font-bold uppercase ${
                                        row.res === 'Big' ? 'text-amber-500' : 'text-blue-500'
                                    }`}>
                                        {row.res}
                                    </td>
                                    <td className="py-2.5">
                                        <span className={`inline-block py-0.5 px-2 rounded text-[9px] font-bold border ${
                                            row.stat === 'WIN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            row.stat === 'LOSS' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            'text-zinc-600 border-transparent'
                                        }`}>
                                            {row.stat}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-12 text-zinc-700 italic">No prediction rounds logged yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
