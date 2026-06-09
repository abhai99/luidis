import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const DualCoreFormula = () => {
    const [offset, setOffset] = useState('0');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        predNum: number;
        predNumSizeText: string;
        strategySizeText: string;
        hasMatches: boolean;
        signalStrength: string;
        signalDesc: string;
    } | null>(null);

    const handleAnalyze = async () => {
        let offsetVal = parseInt(offset);
        if (isNaN(offsetVal)) offsetVal = 0;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/predict?page=3&offset=${offsetVal}`);
            if (!response.ok) throw new Error('API failed');

            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Server error');

            setResult({
                predNum: data.predNum,
                predNumSizeText: data.predNumSizeText,
                strategySizeText: data.strategySizeText,
                hasMatches: data.hasMatches,
                signalStrength: data.signalStrength,
                signalDesc: data.signalDesc
            });

        } catch (error) {
            toast.error('Failed to run dual-core analysis.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto p-4 space-y-6 animate-fade-in text-white">
            <div className="text-center">
                <h2 className="text-2xl font-bold tracking-wide text-sky-400">⚔️ Dual-Core + Custom</h2>
                <p className="text-xs text-muted-foreground mt-1">Cross-validation with customizable input offsets</p>
            </div>

            <Card className="p-5 bg-zinc-950 border-zinc-800 space-y-5 shadow-xl">
                <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block">Add Custom Number (Offset)</label>
                    <Input
                        type="number"
                        placeholder="0"
                        value={offset}
                        onChange={(e) => setOffset(e.target.value)}
                        className="bg-zinc-900 border-zinc-700 text-center font-mono text-lg"
                    />
                </div>

                <Button 
                    onClick={handleAnalyze}
                    disabled={isLoading}
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold h-11"
                >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                    ANALYZE NOW
                </Button>

                {/* Display Results */}
                {result && (
                    <div className="space-y-4 animate-slide-up">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Card 1 */}
                            <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl text-center space-y-1">
                                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Number Formula</span>
                                <div className={`text-4xl font-black ${
                                    result.predNumSizeText === 'BIG' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    {result.predNum}
                                </div>
                                <span className={`text-[10px] font-bold ${
                                    result.predNumSizeText === 'BIG' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    ({result.predNumSizeText})
                                </span>
                            </div>

                            {/* Card 2 */}
                            <div className="bg-zinc-900 border border-zinc-800/80 p-4 rounded-xl text-center flex flex-col justify-center space-y-1">
                                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Size Formula</span>
                                <div className={`text-2xl font-black ${
                                    result.strategySizeText === 'BIG' ? 'text-red-500' : 'text-green-500'
                                }`}>
                                    {result.strategySizeText}
                                </div>
                            </div>
                        </div>

                        {/* Signal Status Box */}
                        <div className={`p-4 rounded-lg border text-center transition-all duration-300 ${
                            result.hasMatches 
                                ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                : 'bg-red-500/10 border-red-500/20 text-red-400'
                        }`}>
                            <strong className="block text-sm font-black tracking-wider uppercase mb-1">
                                {result.hasMatches ? "✅ " : "⚠️ "}{result.signalStrength}
                            </strong>
                            <p className="text-xs opacity-90 font-medium">{result.signalDesc}</p>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
