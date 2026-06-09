import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface HistoryRow {
    issue: string;
    prediction: string;
    actual: string;
    result: 'WIN' | 'LOSS';
}

export const AgniVIP = () => {
    const [prediction, setPrediction] = useState('WAIT');
    const [nextIssue, setNextIssue] = useState('-----');
    const [statusText, setStatusText] = useState('Waiting fetch...');
    
    // Stats
    const [wins, setWins] = useState(0);
    const [losses, setLosses] = useState(0);
    const [accuracy, setAccuracy] = useState('0%');
    const [maxLoss, setMaxLoss] = useState(0);

    // History logs
    const [history, setHistory] = useState<HistoryRow[]>([]);

    const lastFetchedIssueRef = useRef('');
    const currentPredictionRef = useRef<string | null>(null);
    const statsRef = useRef({ w: 0, l: 0, currentLossStreak: 0, maxLossStreak: 0 });

    const fetchHistoryData = async () => {
        try {
            const res = await fetch(`/api/predict?page=2`);
            if (!res.ok) throw new Error('API failure');
            
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const latestIssue = data.serverPeriodStr;
            const list = data.list || [];

            if (latestIssue === lastFetchedIssueRef.current) return;

            // Check previous prediction win/loss
            const curPred = currentPredictionRef.current;
            if (curPred && curPred !== "WAIT") {
                const actualVal = list[0]?.number;
                const actualOutcome = Number(actualVal) >= 5 ? "Big" : "Small";
                const isWin = curPred.toLowerCase() === actualOutcome.toLowerCase();
                let resultText: 'WIN' | 'LOSS' = 'LOSS';

                if (isWin) {
                    statsRef.current.w++;
                    statsRef.current.currentLossStreak = 0;
                    resultText = 'WIN';
                } else {
                    statsRef.current.l++;
                    statsRef.current.currentLossStreak++;
                    if (statsRef.current.currentLossStreak > statsRef.current.maxLossStreak) {
                        statsRef.current.maxLossStreak = statsRef.current.currentLossStreak;
                    }
                    resultText = 'LOSS';
                }

                // Append to history log
                setHistory(prev => [
                    {
                        issue: latestIssue.slice(-5),
                        prediction: curPred,
                        actual: actualOutcome,
                        result: resultText
                    },
                    ...prev.slice(0, 99)
                ]);

                // Update Stats States
                setWins(statsRef.current.w);
                setLosses(statsRef.current.l);
                setMaxLoss(statsRef.current.maxLossStreak);
                const total = statsRef.current.w + statsRef.current.l;
                setAccuracy(total > 0 ? `${((statsRef.current.w / total) * 100).toFixed(2)}%` : '0%');
            }

            // Save new prediction details
            const serverPred = data.prediction;
            setPrediction(serverPred);
            currentPredictionRef.current = serverPred;

            // Next target issue calculation
            const last5 = latestIssue.slice(-5);
            const nextP = (parseInt(last5) + 1).toString().padStart(5, "0");
            const nextIssueStr = latestIssue.slice(0, -5) + nextP;
            setNextIssue(nextIssueStr.slice(-5));

            lastFetchedIssueRef.current = latestIssue;
            setStatusText(`Updated: ${new Date().toLocaleTimeString()}`);

        } catch (error) {
            setStatusText("Fetch error...");
            console.error(error);
        }
    };

    useEffect(() => {
        // Initial Fetch
        fetchHistoryData();

        const scheduler = setInterval(() => {
            const sec = new Date().getSeconds();
            if (sec === 1) {
                fetchHistoryData();
            }
        }, 1000);

        return () => clearInterval(scheduler);
    }, []);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-4 animate-fade-in text-white font-sans pb-12">
            <Card className="bg-[#1a1d24] border-zinc-800 p-5 shadow-xl space-y-4">
                <div className="text-center text-xl font-bold text-white tracking-wide uppercase">
                    WinGo 1 Minute (Agni VIP)
                </div>

                <div className="bg-[#0c1016] border border-zinc-900 rounded-2xl p-6 text-center space-y-3">
                    <span className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Next Prediction</span>
                    <h3 className={`text-5xl font-black tracking-wider uppercase ${
                        prediction === 'Big' ? 'text-emerald-400 drop-shadow-[0_2px_8px_rgba(16,185,129,0.3)]' :
                        prediction === 'Small' ? 'text-rose-400 drop-shadow-[0_2px_8px_rgba(244,63,94,0.3)]' :
                        'text-amber-400'
                    }`}>
                        {prediction}
                    </h3>
                    <div className="text-xs text-zinc-400 font-bold">
                        Next Issue: <span className="text-white font-mono text-sm">{nextIssue}</span>
                    </div>
                </div>

                <div className="text-center text-[10px] text-zinc-500 font-bold tracking-wider">
                    {statusText}
                </div>
            </Card>

            {/* Stats */}
            <Card className="bg-[#1a1d24] border-zinc-800 p-4 shadow-xl">
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-[#0d1117] border border-zinc-900 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">Total Wins</span>
                        <div className="text-xl font-extrabold mt-1 text-emerald-400">{wins}</div>
                    </div>
                    <div className="bg-[#0d1117] border border-zinc-900 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">Total Loss</span>
                        <div className="text-xl font-extrabold mt-1 text-rose-400">{losses}</div>
                    </div>
                    <div className="bg-[#0d1117] border border-zinc-900 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">Win Rate</span>
                        <div className="text-xl font-extrabold mt-1 text-white">{accuracy}</div>
                    </div>
                    <div className="bg-[#0d1117] border border-zinc-900 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide">Max Loss Streak</span>
                        <div className="text-xl font-extrabold mt-1 text-rose-400">{maxLoss}</div>
                    </div>
                </div>
            </Card>

            {/* Table logs */}
            <Card className="bg-[#1a1d24] border-zinc-800 p-4 shadow-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr className="bg-[#0d1117] text-zinc-500 text-[10px] font-bold uppercase tracking-wider sticky top-0 border-b border-zinc-900">
                                <th className="py-2.5">Issue</th>
                                <th className="py-2.5">Pred</th>
                                <th className="py-2.5">Actual</th>
                                <th className="py-2.5">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900/60">
                            {history.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-900/25">
                                    <td className="py-2 font-mono text-zinc-400">{row.issue}</td>
                                    <td className={`py-2 font-bold ${
                                        row.prediction === 'Big' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {row.prediction}
                                    </td>
                                    <td className={`py-2 font-bold ${
                                        row.actual === 'Big' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {row.actual}
                                    </td>
                                    <td className={`py-2 font-bold ${
                                        row.result === 'WIN' ? 'text-emerald-400' : 'text-rose-400'
                                    }`}>
                                        {row.result}
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-zinc-700 italic">History Empty</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest pt-2">
                Auto fetch every IST xx:xx:01 sec
            </div>
        </div>
    );
};
