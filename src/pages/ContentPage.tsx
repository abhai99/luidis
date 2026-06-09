import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { defaultPages } from '@/lib/defaultContent';
import { useAuth } from '@/contexts/AuthContext';
import { PrecisionOracle } from '@/components/tools/PrecisionOracle';
import { LiveMinuteCalculation } from '@/components/tools/LiveMinuteCalculation';
import { DualCoreFormula } from '@/components/tools/DualCoreFormula';
import { ThreeStrategyConsensus } from '@/components/tools/ThreeStrategyConsensus';
import { toast } from 'sonner';

const ContentPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, subscription, loading: authLoading } = useAuth();
    
    const [content, setContent] = useState<string | null>(null);
    const [title, setTitle] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Enforce Route Guard: redirect to home if not subscribed
    useEffect(() => {
        if (!authLoading) {
            if (!user || !subscription?.isSubscribed) {
                toast.error("Subscription required to view this prediction tool.");
                navigate('/', { replace: true });
            }
        }
    }, [user, subscription, authLoading, navigate]);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                // 1. Try fetching from Firestore
                const docRef = doc(db, 'content', 'pages');
                const docSnap = await getDoc(docRef);
                let foundContent = null;
                let foundTitle = null;

                if (docSnap.exists() && id) {
                    const data = docSnap.data();
                    const pageKey = `page${id}`;
                    if (data[pageKey]) {
                        foundContent = data[pageKey].content;
                        foundTitle = data[pageKey].title;
                    }
                }

                // 2. Fallback to Default Content if not in Firestore
                if (!foundContent && id) {
                    const pageKey = `page${id}`; // e.g. "page1"
                    const defaultPage = defaultPages[pageKey as keyof typeof defaultPages];
                    if (defaultPage) {
                        foundContent = defaultPage.content;
                        foundTitle = defaultPage.title;
                        console.log(`Loaded default content for ${pageKey}`);
                    }
                }

                if (foundContent) {
                    setContent(foundContent);
                    setTitle(foundTitle);
                }

            } catch (error) {
                console.error("Error fetching content:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [id]);

    // Execute custom scripts if raw HTML content is rendered
    useEffect(() => {
        if (!content || ['1', '2', '3', '4'].includes(id || '')) return;

        const container = document.getElementById('content-container');
        if (!container) return;

        const scripts = container.getElementsByTagName('script');

        Array.from(scripts).forEach(script => {
            const newScript = document.createElement('script');
            Array.from(script.attributes).forEach(attr => {
                newScript.setAttribute(attr.name, attr.value);
            });

            if (script.innerHTML) {
                newScript.innerHTML = script.innerHTML;
            } else if (script.src) {
                newScript.src = script.src;
            }

            script.parentNode?.replaceChild(newScript, script);
        });
    }, [content, id]);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user || !subscription?.isSubscribed) {
        return null; // Redirecting...
    }

    if (!content && !['1', '2', '3', '4'].includes(id || '')) {
        return (
            <div className="min-h-screen bg-[#050505] pt-32 px-4 text-center text-white">
                <Navbar />
                <h1 className="text-2xl font-bold mb-4">Content Not Found</h1>
                <Button onClick={() => navigate('/')}>Go Home</Button>
            </div>
        );
    }

    const renderTool = () => {
        switch (id) {
            case '1':
                return <PrecisionOracle />;
            case '2':
                return <LiveMinuteCalculation />;
            case '3':
                return <DualCoreFormula />;
            case '4':
                return <ThreeStrategyConsensus />;
            default:
                return (
                    <div
                        id="content-container"
                        className="w-full h-full [&>div]:w-full [&>div]:max-w-none [&_iframe]:w-full [&_iframe]:aspect-video"
                        dangerouslySetInnerHTML={{ __html: content || '' }}
                    />
                );
        }
    };

    return (
        <div className="min-h-screen bg-[#050505] text-foreground flex flex-col pb-16">
            {/* Minimal Sticky Header for App feel */}
            <div className="sticky top-0 z-50 bg-[#050505]/80 backdrop-blur-xl border-b border-zinc-900 px-4 h-10 flex items-center justify-center">
                <h1 className="text-sm font-bold text-center truncate text-white">
                    {id === '1' ? 'Precision Oracle' : 
                     id === '2' ? 'Live Minute Calculation' : 
                     id === '3' ? 'Dual-Core Formula' : 
                     id === '4' ? 'Three-Strategy Consensus' : 
                     title || 'Content'}
                </h1>
            </div>

            {/* Tool Render Area */}
            <div className="flex-1 w-full h-full flex items-center justify-center">
                {renderTool()}
            </div>
        </div>
    );
};

export default ContentPage;
