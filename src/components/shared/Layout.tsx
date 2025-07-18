import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import askqlLogo from '../../assets/askql_logo.gif';
import askqlLogoDark from '../../assets/askql_logo_dark.gif';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        // Initialize theme
        if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
            setTheme('dark');
        } else {
            document.documentElement.classList.remove('dark');
            setTheme('light');
        }
    }, [theme]);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        setTheme(newTheme);
    };

    const navLinkStyle = 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200';
    const activeNavLinkStyle = 'text-blue-600 dark:text-blue-400 font-medium';

    // Get the current logo based on theme
    const currentLogo = theme === 'dark' ? askqlLogoDark : askqlLogo;

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-md z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <Link to="/" className="flex items-center space-x-3">
                            <img 
                                src={currentLogo} 
                                alt="AskQL Logo" 
                                className="h-10 w-auto transition-opacity duration-300"
                            />
                            <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">AskQL</span>
                        </Link>
                        
                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <Link to="/" className={`nav-link ${location.pathname === '/' ? activeNavLinkStyle : navLinkStyle}`}>Home</Link>
                            <Link to="/database" className={`nav-link ${location.pathname === '/database' ? activeNavLinkStyle : navLinkStyle}`}>Database</Link>
                            <Link to="/insights" className={`nav-link ${location.pathname === '/insights' ? activeNavLinkStyle : navLinkStyle}`}>Insights</Link>
                            
                            {/* Theme Toggle Button */}
                            <button 
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                aria-label="Toggle theme"
                            >
                                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-gray-600 dark:text-gray-300`}></i>
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <div className="md:hidden flex items-center space-x-4">
                            <button 
                                onClick={toggleTheme}
                                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                                aria-label="Toggle theme"
                            >
                                <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'} text-gray-600 dark:text-gray-300`}></i>
                            </button>
                            <button 
                                className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 focus:outline-none"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"/>
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation */}
                    <div className={`md:hidden ${isMobileMenuOpen ? '' : 'hidden'}`}>
                        <div className="flex flex-col space-y-4 mt-4 pb-4">
                            <Link to="/" className={`nav-link ${location.pathname === '/' ? activeNavLinkStyle : navLinkStyle}`}>Home</Link>
                            <Link to="/database" className={`nav-link ${location.pathname === '/database' ? activeNavLinkStyle : navLinkStyle}`}>Database</Link>
                            <Link to="/insights" className={`nav-link ${location.pathname === '/insights' ? activeNavLinkStyle : navLinkStyle}`}>Insights</Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-16">
                <div className="relative">
                    {/* Background Video - Only visible in dark mode */}
                    <div className="fixed inset-0 -z-10 w-full h-full overflow-hidden hidden dark:block">
                        <div className="absolute inset-0 bg-black/50 z-10"></div>
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        >
                            <source src="/src/assets/background_dark.mp4" type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>

                    {/* Content Container */}
                    <div className="container mx-auto px-6 py-8">
                        {children}
                    </div>
                </div>
            </main>
        </>
    );
};

export default Layout; 