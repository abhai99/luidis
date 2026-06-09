import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LogItem {
    period: string;
    text: string;
    type: 'win' | 'loss' | 'skip';
}

export const ThreeStrategyConsensus = () => {
    const [clock, setClock] = useState('--:--:--');
    const [countdown, setCountdown] = useState('Next: --s');
    const [isLoading, setIsLoading] = useState(false);

    // Results
    const [lastResult, setLastResult] = useState<{ num: number; outcome: string; period: string } | null>(null);
    const [prediction, setPrediction] = useState<{ final: string; targetPeriod: string } | null>(null);
    
    // Cards
    const [gold, setGold] = useState('-');
    const [silver, setSilver] = useState('-');
    const [bronze, setBronze] = useState('-');

    // Logs
    const [logs, setLogs] = useState<LogItem[]>([]);

    const lastKnownPeriodRef = useRef('0');
    const activePredictionRef = useRef<{ period: string; pick: string } | null>(null);
    const hasFetchedThisMinuteRef = useRef(false);

    const fetchData = async (isManual = false) => {
        if (isManual) setIsLoading(true);
        setCountdown("FETCHING...");

        try {
            const res = await fetch(`/api/predict?page=4`);
            if (!res.ok) throw new Error('API failed');

            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            const serverPeriodStr = data.serverPeriodStr;
            const resultNum = data.resultNum;
            const outcome = data.outcome;

            if (serverPeriodStr !== lastKnownPeriodRef.current) {
                // Check Win/Loss of Previous
                const activePred = activePredictionRef.current;
                if (activePred) {
                    if (activePred.period === serverPeriodStr) {
                        const isWin = (activePred.pick === outcome);
                        setLogs(prev => [
                            { period: serverPeriodStr, text: `${activePred.pick} vs ${outcome}`, type: isWin ? 'win' : 'loss' },
                            ...prev
                        ]);
                    } else {
                        setLogs(prev => [
                            { period: activePred.period, text: 'Skipped', type: 'skip' },
                            ...prev
                        ]);
                    }
                }

                // Update State refs
                lastKnownPeriodRef.current = serverPeriodStr;

                // Calc Target Period
                const nextPeriodStr = String(BigInt(serverPeriodStr) + 1n);

                // Update display state
                setLastResult({
                    num: resultNum,
                    outcome,
                    period: serverPeriodStr
                });

                setPrediction({
                    final: data.final,
                    targetPeriod: nextPeriodStr
                });

                setGold(data.gold);
                setSilver(data.silver);
                setBronze(data.bronze);

                // Set new active prediction
                activePredictionRef.current = {
                    period: nextPeriodStr,
                    pick: data.final
                };
            }
        } catch (error) {
            console.error('Fetch error:', error);
            setCountdown("ERROR");
            if (isManual) toast.error('Error fetching prediction.');
        } finally {
            if (isManual) setIsLoading(false);
        }
    };

    useEffect(() => {
        // Initial Fetch
        fetchData();

        const timer = setInterval(() => {
            const now = new Date();
            const s = now.getSeconds();

            // Set Clock
            setClock(now.toLocaleTimeString('en-US', { hour12: false }));

            // Countdown Scanner logic
            let diff = 62 - s;
            if (diff > 60) diff -= 60;
            
            setCountdown(`Scan in: ${diff}s`);

            // Reset fetch flag at second 50
            if (s > 50) {
                hasFetchedThisMinuteRef.current = false;
            }

            // Trigger fetch at second 02
            if (s === 2 && !hasFetchedThisMinuteRef.current) {
                hasFetchedThisMinuteRef.current = true;
                fetchData();
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-6 animate-fade-in text-white">
            {/* Top Bar */}
            <div className="flex justify-between items-center text-xs font-mono text-zinc-500 border-b border-zinc-900 pb-3">
                <div>CLOCK: <span className="text-white font-bold">{clock}</span></div>
                <div className="text-yellow-400 font-bold">{countdown}</div>
            </div>

            {/* Split Info Cards */}
            <div className="grid grid-cols-2 gap-px bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl">
                {/* Last Result Box */}
                <div className="bg-zinc-950 p-4 text-center space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Last Result</span>
                    <div className={`text-xl font-bold ${
                        lastResult ? (lastResult.outcome === 'Big' ? 'text-red-500' : 'text-green-500') : 'text-zinc-600'
                    }`}>
                        {lastResult ? `${lastResult.num} (${lastResult.outcome})` : '---'}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-600">
                        {lastResult ? `...${lastResult.period.slice(-4)}` : '...'}
                    </div>
                </div>

                {/* Target Prediction Box */}
                <div className="bg-zinc-950 p-4 text-center space-y-1">
                    <span className="text-[10px] text-zinc-500 font-bold block uppercase tracking-wider">Next Target</span>
                    <div className={`text-xl font-black uppercase ${
                        prediction ? (prediction.final === 'Big' ? 'text-red-500 animate-pulse' : 'text-green-500 animate-pulse') : 'text-zinc-600'
                    }`}>
                        {prediction ? prediction.final : '---'}
                    </div>
                    <div className="text-[10px] font-mono text-green-500">
                        {prediction ? `...${prediction.targetPeriod.slice(-4)}` : '...'}
                    </div>
                </div>
            </div>

            {/* Strategy Consensus Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl text-center space-y-1 border-b-2 border-b-yellow-500">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">🥇 Link</span>
                    <span className={`text-sm font-bold ${
                        gold === 'Big' ? 'text-red-500' : gold === 'Small' ? 'text-green-500' : 'text-zinc-500'
                    }`}>
                        {gold}
                    </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl text-center space-y-1 border-b-2 border-b-zinc-400">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">🥈 Neural</span>
                    <span className={`text-sm font-bold ${
                        silver === 'Big' ? 'text-red-500' : silver === 'Small' ? 'text-green-500' : 'text-zinc-500'
                    }`}>
                        {silver}
                    </span>
                </div>
                <div className="bg-zinc-950 border border-zinc-800/80 p-3 rounded-xl text-center space-y-1 border-b-2 border-b-amber-700">
                    <span className="text-[9px] uppercase font-bold text-zinc-500 block">🥉 Time</span>
                    <span className={`text-sm font-bold ${
                        bronze === 'Big' ? 'text-red-500' : bronze === 'Small' ? 'text-green-500' : 'text-zinc-500'
                    }`}>
                        {bronze}
                    </span>
                </div>
            </div>

            {/* Manual Fetch Button */}
            <Button
                onClick={() => fetchData(true)}
                disabled={isLoading}
                className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white font-bold h-10 text-xs"
            >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                FORCE MANUAL FETCH
            </Button>

            {/* Log History */}
            <div className="space-y-2">
                <h4 className="text-xs uppercase font-black text-zinc-400 tracking-wider">Historical Logs</h4>
                <div className="h-48 overflow-y-auto bg-black border border-zinc-800 rounded-xl p-3 font-mono text-xs space-y-2">
                    {logs.map((log, idx) => (
                        <div key={idx} className="flex justify-between border-b border-zinc-900 pb-1.5 last:border-0">
                            <span className="text-zinc-500">...{log.period.slice(-4)}</span>
                            <span className="text-zinc-300 font-bold">{log.text}</span>
                            <span className={`font-black uppercase ${
                                log.type === 'win' ? 'text-green-500' : log.type === 'loss' ? 'text-red-500' : 'text-zinc-500'
                            }`}>
                                {log.type === 'win' ? 'WIN 🟢' : log.type === 'loss' ? 'LOSS 🔴' : 'SKIP ⚪'}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 ? (
                        <div className="text-center py-14 text-zinc-700">Waiting for next scan issue...</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
