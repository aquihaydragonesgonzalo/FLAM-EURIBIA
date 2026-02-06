import React, { useState, useEffect } from 'react';
import { CalendarClock, Map as MapIcon, Wallet, BookOpen, Anchor, Lock, ArrowRight } from 'lucide-react';
import { INITIAL_ITINERARY, SHIP_DEPARTURE_TIME, ONBOARD_TIME, ARRIVAL_TIME, VALID_CODES } from './constants';
import { Activity, Coords } from './types';
import Timeline from './components/Timeline';
import Budget from './components/Budget';
import Guide from './components/Guide';
import MapComponent from './components/MapComponent';
import ActivityDetailModal from './components/ActivityDetailModal';

const App: React.FC = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [authError, setAuthError] = useState(false);

    const [itinerary, setItinerary] = useState<Activity[]>(INITIAL_ITINERARY);
    const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'budget' | 'guide'>('timeline');
    const [userLocation, setUserLocation] = useState<Coords | null>(null);
    const [userHeading, setUserHeading] = useState<number>(0);
    const [mapFocus, setMapFocus] = useState<Coords | null>(null);
    
    const [selectedActivityConfig, setSelectedActivityConfig] = useState<{ activity: Activity, autoOpenAudio: boolean } | null>(null);
    
    const [countdown, setCountdown] = useState('');
    const [countdownLabel, setCountdownLabel] = useState('Salida');

    // Check Auth on Mount
    useEffect(() => {
        const storedAuth = localStorage.getItem('flam_guide_auth');
        if (storedAuth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleLogin = (e?: React.FormEvent) => {
        if(e) e.preventDefault();
        
        if (VALID_CODES.includes(accessCode.toUpperCase().trim())) {
            localStorage.setItem('flam_guide_auth', 'true');
            setIsAuthenticated(true);
            setAuthError(false);
        } else {
            setAuthError(true);
            setAccessCode('');
        }
    };

    // Geolocation
    useEffect(() => {
        if (isAuthenticated && 'geolocation' in navigator) {
            const id = navigator.geolocation.watchPosition(
                p => setUserLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
                e => console.warn(e),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(id);
        }
    }, [isAuthenticated]);

    // Device Orientation (Compass)
    useEffect(() => {
        if (!isAuthenticated) return;

        const handleOrientation = (event: DeviceOrientationEvent) => {
            // iOS uses webkitCompassHeading for true north, Android/Standard uses alpha
            let heading = 0;
            if ((event as any).webkitCompassHeading) {
                heading = (event as any).webkitCompassHeading;
            } else if (event.alpha) {
                heading = 360 - event.alpha; // Android alpha rotates opposite to compass bearing usually
            }
            setUserHeading(heading);
        };

        if (window.DeviceOrientationEvent) {
            window.addEventListener('deviceorientation', handleOrientation);
        }
        return () => {
            window.removeEventListener('deviceorientation', handleOrientation);
        };
    }, [isAuthenticated]);

    // Smart Countdown
    useEffect(() => {
        if (!isAuthenticated) return;

        const interval = setInterval(() => {
            const now = new Date();
            
            // Parse Times
            const [ah, am] = ARRIVAL_TIME.split(':').map(Number);
            const arrivalDate = new Date(); arrivalDate.setHours(ah, am, 0, 0);

            const [oh, om] = ONBOARD_TIME.split(':').map(Number);
            const onboardDate = new Date(); onboardDate.setHours(oh, om, 0, 0);

            let target, label;

            if (now < arrivalDate) {
                target = arrivalDate;
                label = "Faltan para Llegada";
            } else {
                target = onboardDate;
                label = "Tiempo Restante";
            }

            setCountdownLabel(label);

            const diff = target.getTime() - now.getTime();
            
            if (diff <= 0 && target === onboardDate) setCountdown("¡A BORDO!");
            else if (diff <= 0 && target === arrivalDate) setCountdown("¡LLEGANDO!");
            else {
                const hr = Math.floor(diff/(1000*60*60));
                const mn = Math.floor((diff%(1000*60*60))/(1000*60));
                const sc = Math.floor((diff%(1000*60))/1000);
                setCountdown(`${hr}h ${mn}m ${sc}s`);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [isAuthenticated]);

    const handleToggleComplete = (id: string) => {
        setItinerary(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a));
    };

    const handleLocate = (c1: Coords, c2?: Coords) => {
        setMapFocus(c1);
        setActiveTab('map');
    };
    
    const handleSelectActivity = (activity: Activity, autoOpenAudio = false) => {
        setSelectedActivityConfig({ activity, autoOpenAudio });
    };

    // LOGIN SCREEN RENDER
    if (!isAuthenticated) {
        return (
            <div className="flex flex-col h-screen bg-fjord-900 items-center justify-center p-6 text-white">
                <div className="w-full max-w-sm bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-white/20 p-4 rounded-full mb-4 ring-4 ring-white/5">
                            <Lock size={40} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold">Acceso Restringido</h1>
                        <p className="text-fjord-100 text-sm text-center mt-2">
                            Introduce el código de viajero que te facilitará el creador de esta APP para acceder a la guía de Flåm 2026.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <input 
                                type="text" 
                                placeholder="CÓDIGO DE ACCESO" 
                                value={accessCode}
                                onChange={(e) => { setAccessCode(e.target.value); setAuthError(false); }}
                                className="w-full text-center bg-black/20 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 tracking-widest font-bold outline-none focus:border-sunset-500 focus:bg-black/30 transition-all uppercase"
                            />
                            {authError && (
                                <p className="text-red-300 text-xs font-bold text-center mt-2 animate-pulse">
                                    Código incorrecto. Inténtalo de nuevo.
                                </p>
                            )}
                        </div>
                        <button 
                            type="submit"
                            disabled={!accessCode}
                            className="w-full bg-gradient-to-r from-sunset-500 to-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <span className="mr-2">Entrar a la Guía</span>
                            <ArrowRight size={18} />
                        </button>
                    </form>
                    
                    <div className="mt-8 text-center text-[10px] text-white/30">
                        © 2026 Gonzalo Arenas de la Hoz
                    </div>
                </div>
            </div>
        );
    }

    // MAIN APP RENDER
    return (
        <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden select-none animate-in fade-in duration-500">
            <header className="bg-fjord-900 text-white p-3 shadow-md z-20 flex justify-between items-center shrink-0">
                <div className="flex items-center">
                    <Anchor className="mr-2 text-sunset-500" size={20} />
                    <div>
                        <h1 className="font-bold text-sm leading-none">Todos a Bordo: {ONBOARD_TIME}</h1>
                        <p className="text-[10px] text-fjord-200">Salida Barco: {SHIP_DEPARTURE_TIME}</p>
                    </div>
                </div>
                <div className="text-right">
                        <div className="text-[10px] text-sunset-200 uppercase tracking-widest">{countdownLabel}</div>
                        <div className="text-xl font-mono font-bold text-sunset-500 tabular-nums">{countdown}</div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden relative">
                {activeTab === 'timeline' && (
                    <Timeline 
                        itinerary={itinerary} 
                        onToggleComplete={handleToggleComplete} 
                        onLocate={handleLocate} 
                        userLocation={userLocation} 
                        userHeading={userHeading}
                        onSelectActivity={handleSelectActivity} 
                    />
                )}
                {activeTab === 'map' && <MapComponent activities={itinerary} userLocation={userLocation} focusedLocation={mapFocus} />}
                {activeTab === 'budget' && <Budget itinerary={itinerary} />}
                {activeTab === 'guide' && <Guide userLocation={userLocation} />}
            </main>

            {selectedActivityConfig && (
                <ActivityDetailModal 
                    activity={selectedActivityConfig.activity} 
                    initialAutoOpen={selectedActivityConfig.autoOpenAudio}
                    onClose={() => setSelectedActivityConfig(null)} 
                />
            )}

            <nav className="bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30 pb-safe shrink-0">
                <div className="flex justify-around items-center h-16">
                    {[
                        { id: 'timeline', icon: CalendarClock, label: 'Itinerario' },
                        { id: 'map', icon: MapIcon, label: 'Mapa' },
                        { id: 'budget', icon: Wallet, label: 'Gastos' },
                        { id: 'guide', icon: BookOpen, label: 'Guía' }
                    ].map(tab => (
                        <button 
                            key={tab.id} 
                            onClick={() => setActiveTab(tab.id as any)} 
                            className={`flex flex-col items-center w-full h-full justify-center transition-colors ${activeTab === tab.id ? 'text-fjord-600' : 'text-slate-300'}`}
                        >
                            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
                            <span className="text-[10px] mt-1 font-bold">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default App;