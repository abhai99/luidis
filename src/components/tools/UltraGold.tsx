import { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

interface HistoryRow {
    issue: string;
    actualNum: number;
    actualSize: 'BIG' | 'SMALL';
    predNums: number[];
    predSize: 'BIG' | 'SMALL';
    result: 'WIN' | 'LOSS';
}

export const UltraGold = () => {
    // Prediction targets
    const [pendingPrediction, setPendingPrediction] = useState<{
        targetIssue: string;
        numbers: number[];
        size: 'BIG' | 'SMALL';
    } | null>(null);

    // Stats
    const [maxWin, setMaxWin] = useState(0);
    const [maxLoss, setMaxLoss] = useState(0);

    // History logs
    const [history, setHistory] = useState<HistoryRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const lastProcessedIssueRef = useRef<string | null>(null);
    const pendingPredictionRef = useRef<{ targetIssue: string; numbers: number[]; size: 'BIG' | 'SMALL' } | null>(null);
    
    const statsRef = useRef({
        maxWin: 0,
        maxLoss: 0,
        currentStreak: 0,
        currentStreakType: null as 'WIN' | 'LOSS' | null
    });

    const updateStats = (resultType: 'WIN' | 'LOSS') => {
        if (statsRef.current.currentStreakType === resultType) {
            statsRef.current.currentStreak++;
        } else {
            statsRef.current.currentStreak = 1;
            statsRef.current.currentStreakType = resultType;
        }

        if (statsRef.current.currentStreakType === 'WIN' && statsRef.current.currentStreak > statsRef.current.maxWin) {
            statsRef.current.maxWin = statsRef.current.currentStreak;
        }
        if (statsRef.current.currentStreakType === 'LOSS' && statsRef.current.currentStreak > statsRef.current.maxLoss) {
            statsRef.current.maxLoss = statsRef.current.currentStreak;
        }

        setMaxWin(statsRef.current.maxWin);
        setMaxLoss(statsRef.current.maxLoss);
    };

    const fetchHistoryData = async (isFirstLoad = false) => {
        try {
            const ts = Date.now();
            const res = await fetch(`https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=${ts}&pageSize=60&pageNo=1`, { cache: "no-store" });
            if (!res.ok) throw new Error('API failure');
            
            const data = await res.json();
            if (!data?.data?.list?.length) throw new Error('Failed to fetch draw data');

            const list = data.data.list;
            const newestDraw = list[0];
            const latestIssue = newestDraw.issueNumber;

            if (isFirstLoad) {
                // Back-test from server list (newest to oldest)
                const reversedList = [...list].reverse(); // oldest to newest
                const backtestHistory: HistoryRow[] = [];

                for (let i = 0; i < reversedList.length - 1; i++) {
                    const currentDraw = reversedList[i];
                    const nextDraw = reversedList[i + 1];

                    // run target prediction calculations for currentDraw
                    const lastDigitOfIssue = parseInt(currentDraw.issueNumber.slice(-1));
                    const lastDrawnNumber = parseInt(currentDraw.number);
                    const P = (lastDrawnNumber + lastDigitOfIssue) % 10;
                    const numbers = [(P - 1 + 10) % 10, P, (P + 1) % 10];
                    const size = P >= 5 ? 'BIG' : 'SMALL';

                    const actualNum = parseInt(nextDraw.number);
                    const actualSize = actualNum >= 5 ? 'BIG' : 'SMALL';

                    const isWin = (size === actualSize) || numbers.includes(actualNum);
                    const resultType = isWin ? 'WIN' : 'LOSS';

                    updateStats(resultType);

                    backtestHistory.unshift({
                        issue: nextDraw.issueNumber.slice(-5),
                        actualNum,
                        actualSize,
                        predNums: numbers,
                        predSize: size,
                        result: resultType
                    });
                }

                setHistory(backtestHistory);
                setIsLoading(false);

            } else {
                if (latestIssue === lastProcessedIssueRef.current) return;

                // Evaluate our pending prediction
                const pending = pendingPredictionRef.current;
                if (pending && pending.targetIssue === latestIssue) {
                    const actualNum = parseInt(newestDraw.number);
                    const actualSize = actualNum >= 5 ? 'BIG' : 'SMALL';

                    const isWin = (pending.size === actualSize) || pending.numbers.includes(actualNum);
                    const resultType = isWin ? 'WIN' : 'LOSS';

                    updateStats(resultType);

                    setHistory(prev => [
                        {
                            issue: latestIssue.slice(-5),
                            actualNum,
                            actualSize,
                            predNums: pending.numbers,
                            predSize: pending.size,
                            result: resultType
                        },
                        ...prev.slice(0, 49)
                    ]);
                }
            }

            // Set up next prediction
            lastProcessedIssueRef.current = latestIssue;
            const nextIssueString = String(BigInt(latestIssue) + 1n);
            
            const lastDigitOfIssue = parseInt(latestIssue.slice(-1));
            const lastDrawnNumber = parseInt(newestDraw.number);
            const P = (lastDrawnNumber + lastDigitOfIssue) % 10;
            const predNums = [(P - 1 + 10) % 10, P, (P + 1) % 10];
            const predSize = P >= 5 ? 'BIG' : 'SMALL';

            const nextPred = {
                targetIssue: nextIssueString,
                numbers: predNums,
                size: predSize as 'BIG' | 'SMALL'
            };

            setPendingPrediction(nextPred);
            pendingPredictionRef.current = nextPred;

        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        // First load backtests immediately
        fetchHistoryData(true);

        let lastFetchTime = 0;
        const clockInterval = setInterval(() => {
            const s = new Date().getSeconds();

            // Trigger fetches at specified seconds window
            const isFetchWindow = [1, 3, 5, 31, 33, 35].includes(s);
            if (isFetchWindow && (Date.now() - lastFetchTime > 1500)) {
                fetchHistoryData();
                lastFetchTime = Date.now();
            }
        }, 1000);

        return () => clearInterval(clockInterval);
    }, []);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-4 animate-fade-in text-zinc-800 font-sans pb-12">
            <Card className="bg-white border-zinc-200 p-5 shadow-xl space-y-4 text-center">
                <div className="text-xl font-black text-orange-500 uppercase tracking-wide">
                    WinGo 30S (ULTRA GOld)
                </div>

                {isLoading ? (
                    <div className="py-12 flex justify-center text-zinc-400 text-xs italic">
                        Instantiating historical alignment backtest...
                    </div>
                ) : (
                    pendingPrediction && (
                        <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-6 text-center space-y-3">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Next Target Period</span>
                            <div className="text-sm font-black font-mono text-zinc-500">
                                ...{pendingPrediction.targetIssue.slice(-5)}
                            </div>
                            <div className="flex justify-center items-center gap-3 py-1">
                                <span className={`text-xs font-black uppercase py-1 px-4 border rounded-full ${
                                    pendingPrediction.size === 'BIG' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'
                                }`}>
                                    {pendingPrediction.size}
                                </span>
                                <span className="text-zinc-600 font-extrabold text-lg tracking-wider font-mono">
                                    [{pendingPrediction.numbers.join(', ')}]
                                </span>
                            </div>
                        </div>
                    )
                )}
            </Card>

            {/* Stats */}
            <Card className="bg-white border-zinc-200 p-4 shadow-xl">
                <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wide">Max Win Streak</span>
                        <div className="text-xl font-extrabold mt-1 text-emerald-600">{maxWin}</div>
                    </div>
                    <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-xl">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wide">Max Loss Streak</span>
                        <div className="text-xl font-extrabold mt-1 text-rose-600">{maxLoss}</div>
                    </div>
                </div>
            </Card>

            {/* Table logs */}
            <Card className="bg-white border-zinc-200 p-4 shadow-xl overflow-hidden">
                <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-center text-xs border-collapse">
                        <thead>
                            <tr className="bg-zinc-100 text-zinc-400 text-[10px] font-bold uppercase tracking-wider sticky top-0 border-b border-zinc-200">
                                <th className="py-2.5">Issue</th>
                                <th className="py-2.5">Actual Outcome</th>
                                <th className="py-2.5">Target Prediction</th>
                                <th className="py-2.5">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                            {history.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50/60 text-zinc-700">
                                    <td className="py-2 font-mono font-bold text-zinc-400">{row.issue}</td>
                                    <td className="py-2">
                                        <div className="font-extrabold text-sm">{row.actualNum}</div>
                                        <span className={`inline-block text-[8px] font-black px-2 rounded-full border ${
                                            row.actualSize === 'BIG' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'
                                        }`}>
                                            {row.actualSize.charAt(0)}
                                        </span>
                                    </td>
                                    <td className="py-2">
                                        <div className="text-[10px] text-zinc-400 font-mono font-bold">{row.predNums.join(',')}</div>
                                        <span className={`inline-block text-[8px] font-black px-2 rounded-full border ${
                                            row.predSize === 'BIG' ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-blue-100 text-blue-600 border-blue-200'
                                        }`}>
                                            {row.predSize.charAt(0)}
                                        </span>
                                    </td>
                                    <td className={`py-2 font-black tracking-wide text-xs ${
                                        row.result === 'WIN' ? 'text-emerald-600' : 'text-rose-600'
                                    }`}>
                                        {row.result}
                                    </td>
                                </tr>
                            ))}
                            {history.length === 0 && !isLoading && (
                                <tr>
                                    <td colSpan={4} className="py-12 text-zinc-400 italic">History Empty</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="text-center text-[10px] text-zinc-500 font-bold uppercase tracking-widest pt-2">
                Scan draw updates at :01, :03, :05 IST
            </div>
        </div>
    );
};
