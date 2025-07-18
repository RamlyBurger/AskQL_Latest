import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { initClientLogosScroll, initFallingStars } from '../utils/homeEffects';
import { Counter } from '../components/Counter';

interface TestimonialData {
    content: string;
    author: string;
    role: string;
    image: string;
}

const testimonials: TestimonialData[] = [
    {
        content: "Working with the ShopMe team has been a game-changer for our online presence. Their innovative approaches and dedication to excellence resulted in a 40% increase in our conversion rate.",
        author: "Sarah Johnson",
        role: "CEO, TechSolutions",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    },
    {
        content: "The team's attention to detail and ability to understand our unique requirements set them apart from other agencies we've worked with. Our e-commerce platform has never performed better!",
        author: "David Chen",
        role: "CTO, RetailNova",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    },
    {
        content: "From the initial consultation to the final product launch, ShopMe exceeded our expectations at every turn. Their customer support is unmatched, and the solutions they delivered helped us scale our business rapidly.",
        author: "Michelle Torres",
        role: "Marketing Director, GrowthFusion",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&q=80"
    }
];

const HomePage = () => {
    // Testimonial state and refs
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startPos, setStartPos] = useState(0);
    const [currentTranslate, setCurrentTranslate] = useState(0);
    const [prevTranslate, setPrevTranslate] = useState(0);
    const [animationID, setAnimationID] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);
    const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initClientLogosScroll();
        initFallingStars();
        startAutoplay();
        return () => stopAutoplay();
    }, []);

    // Testimonial functions
    const moveToSlide = (index: number) => {
        setCurrentIndex(index);
        const translate = index * -(100 / testimonials.length);
        setCurrentTranslate(translate);
        setPrevTranslate(translate);
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(${translate}%)`;
        }
    };

    const moveToNextSlide = () => {
        if (currentIndex >= testimonials.length - 1) {
            moveToSlide(0);
        } else {
            moveToSlide(currentIndex + 1);
        }
    };

    const moveToPrevSlide = () => {
        if (currentIndex <= 0) {
            moveToSlide(testimonials.length - 1);
        } else {
            moveToSlide(currentIndex - 1);
        }
    };

    const startAutoplay = () => {
        stopAutoplay();
        autoplayTimerRef.current = setInterval(moveToNextSlide, 5000);
    };

    const stopAutoplay = () => {
        if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
        }
    };

    const getPositionX = (event: MouseEvent | TouchEvent) => {
        return event instanceof MouseEvent ? event.pageX : event.touches[0].clientX;
    };

    const touchStart = (event: React.MouseEvent | React.TouchEvent) => {
        stopAutoplay();
        setStartPos(getPositionX(event.nativeEvent));
        setIsDragging(true);
        if (trackRef.current) {
            trackRef.current.style.transition = 'none';
            trackRef.current.classList.add('cursor-grabbing');
        }
        const animId = requestAnimationFrame(animation);
        setAnimationID(animId);
    };

    const touchMove = (event: React.MouseEvent | React.TouchEvent) => {
        if (isDragging && trackRef.current) {
            const currentPosition = getPositionX(event.nativeEvent);
            const moveBy = (currentPosition - startPos) / trackRef.current.offsetWidth * 100;
            setCurrentTranslate(prevTranslate + moveBy);
            trackRef.current.style.transform = `translateX(${currentTranslate}%)`;
        }
    };

    const touchEnd = () => {
        setIsDragging(false);
        if (animationID !== null) {
            cancelAnimationFrame(animationID);
        }
        if (trackRef.current) {
            trackRef.current.classList.remove('cursor-grabbing');
            trackRef.current.style.transition = 'transform 0.3s ease-out';
        }

        const movedBy = currentTranslate - prevTranslate;
        
        if (Math.abs(movedBy) > 20) {
            if (movedBy < 0) {
                moveToNextSlide();
            } else {
                moveToPrevSlide();
            }
        } else {
            moveToSlide(currentIndex);
        }

        startAutoplay();
    };

    const animation = () => {
        if (isDragging) {
            requestAnimationFrame(animation);
        }
    };

    return (
        <div>
            {/* Hero Section */}
            <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 from-blue-50 -z-10"></div>
                <div className="container mx-auto px-6 py-24">
                    <div className="text-center" data-aos="fade-up">
                        <h1 className="text-6xl md:text-7xl font-bold mb-8 text-gray-900 dark:text-white">
                            <span className="text-blue-600 dark:text-blue-400">Transform</span> Your
                            <br />Database Experience
                        </h1>
                        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl mx-auto">
                            Intelligent database management and analysis platform powered by AI.
                            Visualize, analyze, and optimize your data like never before.
                        </p>
                        <Link 
                            to="/database"
                            className="bg-blue-600 text-white px-8 py-4 rounded-full text-lg font-semibold 
                                     hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition transform hover:scale-105"
                        >
                            Start Your Journey
                        </Link>
                    </div>
                    
                    <div className="hero-scroll" onClick={() => {
                        const servicesSection = document.querySelector('#services');
                        if (servicesSection) {
                            servicesSection.scrollIntoView({ behavior: 'smooth' });
                        }
                    }}>
                        <div className="mouse"></div>
                        <span>Scroll Down</span>
                    </div>
                </div>
            </section>

            {/* Key Services Section */}
            <section id="services" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="backdrop-blur-xl bg-gradient-to-r from-blue-100 via-purple-100 to-pink-100 
                        dark:bg-gradient-to-r dark:from-gray-800/20 dark:via-gray-700/20 dark:to-gray-800/20 
                        rounded-3xl shadow-xl p-12 mb-12 
                        border border-white/20 dark:border-gray-600/20
                        shadow-lg shadow-blue-500/10 dark:shadow-blue-400/10
                        transition-all duration-500 relative overflow-hidden
                        animate-gradient-slow
                        after:absolute after:inset-0 after:bg-gradient-to-r after:from-blue-500/10 after:via-purple-500/10 after:to-pink-500/10 
                        dark:after:from-blue-400/5 dark:after:via-purple-400/5 dark:after:to-pink-400/5">
                        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900 dark:text-white" data-aos="fade-up">Key Services</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                            {/* Database Management */}
                            <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700 shadow-lg transform hover:-translate-y-2 transition duration-300"
                                 data-aos="fade-up" data-aos-delay="100">
                                <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-4 mx-auto xl:mx-0">
                                    <i className="fas fa-database text-blue-600 dark:text-blue-400 text-2xl"></i>
                                </div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center xl:text-left">Smart Database Management</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center xl:text-left">Effortlessly manage your databases with AI-powered tools. Optimize queries, monitor performance, and get intelligent suggestions.</p>
                            </div>

                            {/* ERD Builder */}
                            <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700 shadow-lg transform hover:-translate-y-2 transition duration-300"
                                 data-aos="fade-up" data-aos-delay="200">
                                <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-4 mx-auto xl:mx-0">
                                    <i className="fas fa-project-diagram text-green-600 dark:text-green-400 text-2xl"></i>
                                </div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center xl:text-left">Visual ERD Builder</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center xl:text-left">Design and visualize your database structure with our intuitive ERD builder. Create relationships and optimize your database architecture with smart suggestions.</p>
                            </div>

                            {/* AI Insights */}
                            <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-700 shadow-lg transform hover:-translate-y-2 transition duration-300"
                                 data-aos="fade-up" data-aos-delay="300">
                                <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 w-16 h-16 flex items-center justify-center mb-4 mx-auto xl:mx-0">
                                    <i className="fas fa-brain text-purple-600 dark:text-purple-400 text-2xl"></i>
                                </div>
                                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white text-center xl:text-left">Advanced Analytics & AI Insights</h3>
                                <p className="text-gray-600 dark:text-gray-300 text-center xl:text-left">Get real-time data analysis with interactive visualizations and AI-powered insights to optimize your database performance.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials Section */}
            <section id="testimonials" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="container mx-auto px-6 py-20 select-none">
                        <div className="text-center mb-16" data-aos="fade-up">
                            <h2 className="text-4xl font-bold text-gray-900 dark:text-white">Client <span className="text-blue-600 dark:text-blue-500">Testimonials</span></h2>
                            <p className="text-gray-600 dark:text-gray-400 mt-4">What our clients say about our services</p>
                        </div>

                        <div className="testimonial-container relative overflow-hidden max-w-4xl mx-auto" data-aos="fade-up" data-aos-delay="100">
                            <button 
                                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center select-none border border-gray-200 dark:border-gray-600"
                                onClick={moveToPrevSlide}
                            >
                                <i className="fas fa-chevron-left text-gray-600 dark:text-gray-300"></i>
                            </button>

                            <div 
                                ref={trackRef}
                                className="flex transition-transform duration-300 ease-out"
                                style={{ 
                                    width: `${testimonials.length * 100}%`,
                                    transform: `translateX(${currentTranslate}%)`,
                                    cursor: isDragging ? 'grabbing' : 'grab'
                                }}
                                onMouseDown={touchStart}
                                onTouchStart={touchStart}
                                onMouseMove={touchMove}
                                onTouchMove={touchMove}
                                onMouseUp={touchEnd}
                                onTouchEnd={touchEnd}
                                onMouseLeave={touchEnd}
                            >
                                {testimonials.map((testimonial, index) => (
                                    <div 
                                        key={index}
                                        className="w-full flex-none"
                                        style={{ width: `${100 / testimonials.length}%` }}
                                        data-aos="fade-up"
                                        data-aos-delay={200 + index * 100}
                                    >
                                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 dark:border-gray-600 mx-4">
                                            <div className="text-blue-600 dark:text-blue-500 text-5xl mb-6">
                                                <i className="fas fa-quote-left"></i>
                                            </div>
                                            <p className="text-gray-700 dark:text-gray-300 text-lg mb-8">{testimonial.content}</p>
                                            <div className="flex items-center">
                                                <img 
                                                    src={testimonial.image} 
                                                    alt={testimonial.author} 
                                                    className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                                                />
                                                <div className="ml-4">
                                                    <h4 className="text-gray-900 dark:text-white font-semibold">{testimonial.author}</h4>
                                                    <p className="text-gray-600 dark:text-gray-400">{testimonial.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center select-none border border-gray-200 dark:border-gray-600"
                                onClick={moveToNextSlide}
                            >
                                <i className="fas fa-chevron-right text-gray-600 dark:text-gray-300"></i>
                            </button>

                            <div className="flex justify-center mt-8 space-x-2" data-aos="fade-up" data-aos-delay="300">
                                {testimonials.map((_, index) => (
                                    <button
                                        key={index}
                                        className={`w-3 h-3 rounded-full cursor-pointer select-none ${
                                            index === currentIndex 
                                                ? 'bg-blue-600 dark:bg-blue-500' 
                                                : 'bg-gray-300 dark:bg-gray-600'
                                        }`}
                                        onClick={() => moveToSlide(index)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Our Clients Section */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="backdrop-blur-xl bg-gradient-to-r from-green-100 via-teal-100 to-blue-100
                        dark:bg-gradient-to-r dark:from-gray-800/20 dark:via-gray-700/20 dark:to-gray-800/20
                        rounded-3xl shadow-xl p-12
                        border border-white/20 dark:border-gray-600/20
                        shadow-lg shadow-green-500/10 dark:shadow-green-400/10
                        transition-all duration-500 relative overflow-hidden
                        animate-gradient-slow
                        after:absolute after:inset-0 after:bg-gradient-to-r after:from-green-500/10 after:via-teal-500/10 after:to-blue-500/10
                        dark:after:from-green-400/5 dark:after:via-teal-400/5 dark:after:to-blue-400/5">
                        <h2 className="text-4xl font-bold text-center mb-16 text-gray-900 dark:text-white" data-aos="fade-up">Our Clients</h2>
                        <div className="logo-rows space-y-16">
                            {/* First Row - Left to Right */}
                            <div className="logo-row flex space-x-8 animate-scroll-left">
                                <div className="logo-container min-w-[150px] h-[60px] bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                    <img src="https://static.vecteezy.com/system/resources/previews/013/901/773/original/facebook-icon-ios-facebook-social-media-logo-on-white-background-free-free-vector.jpg" alt="Company Name" className="w-32 h-auto" />
                                </div>
                            </div>
                            
                            {/* Second Row - Right to Left */}
                            <div className="logo-row flex space-x-8 animate-scroll-right">
                                <div className="logo-container min-w-[150px] h-[60px] bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                                    <img src="https://static.vecteezy.com/system/resources/previews/013/901/773/original/facebook-icon-ios-facebook-social-media-logo-on-white-background-free-free-vector.jpg" alt="Company Name" className="w-32 h-auto" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section className="py-24" id="about">
                <div className="container mx-auto px-6">
                    <div className="backdrop-blur-xl bg-gradient-to-r from-orange-100 via-red-100 to-purple-100
                        dark:bg-gradient-to-r dark:from-gray-800/20 dark:via-gray-700/20 dark:to-gray-800/20
                        rounded-3xl shadow-xl p-12
                        border border-white/20 dark:border-gray-600/20
                        shadow-lg shadow-orange-500/10 dark:shadow-orange-400/10
                        transition-all duration-500 relative overflow-hidden
                        animate-gradient-slow
                        after:absolute after:inset-0 after:bg-gradient-to-r after:from-orange-500/10 after:via-red-500/10 after:to-purple-500/10
                        dark:after:from-orange-400/5 dark:after:via-red-400/5 dark:after:to-purple-400/5">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                            {/* About Image */}
                            <div className="relative order-2 lg:order-1" data-aos="fade-right">
                                <img src="https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
                                     alt="Our Team" 
                                     className="rounded-lg shadow-xl w-full" />
                                <div className="absolute -bottom-8 -right-8 bg-blue-600 dark:bg-blue-400 text-white p-8 rounded-full shadow-lg text-center w-36 h-36 flex flex-col justify-center items-center">
                                    <div className="text-4xl font-bold">10</div>
                                    <div className="text-sm leading-tight">Years of<br />Excellence</div>
                                </div>
                            </div>

                            {/* About Content */}
                            <div className="order-1 lg:order-2 space-y-8">
                                <div>
                                    <h2 className="text-5xl font-bold text-gray-900 dark:text-white">
                                        About <span className="text-blue-600 dark:text-blue-400">AskQL</span>
                                    </h2>
                                </div>

                                <p className="text-gray-600 dark:text-gray-300 text-lg">
                                    Founded in 2015, AskQL has been revolutionizing database management through AI-powered solutions. 
                                    Our innovative platform empowers developers and businesses to interact with their databases more 
                                    intuitively, making complex data operations simple and efficient.
                                </p>

                                {/* Mission & Vision */}
                                <div className="space-y-6">
                                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl space-y-4 border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-300">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                                            <span className="text-blue-600 dark:text-blue-400 mr-3"><i className="fas fa-bullseye"></i></span> Our Mission
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            To revolutionize database management by making it more accessible, intelligent, and 
                                            efficient through AI-powered solutions and intuitive interfaces.
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl space-y-4 border border-gray-200 dark:border-gray-600 hover:shadow-xl transition-shadow duration-300">
                                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                                            <span className="text-blue-600 dark:text-blue-400 mr-3"><i className="fas fa-eye"></i></span> Our Vision
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-300">
                                            To be the global leader in intelligent database management solutions, setting new 
                                            standards for how businesses interact with and understand their data.
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 bg-gray-50 dark:bg-gray-700 p-8 rounded-xl">
                                    <div className="text-center p-4">
                                        <Counter target={500} className="block text-4xl font-bold text-blue-600 dark:text-blue-400" />
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Projects<br />Completed</span>
                                    </div>

                                    <div className="text-center p-4">
                                        <Counter target={150} className="block text-4xl font-bold text-blue-600 dark:text-blue-400" />
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Happy<br />Clients</span>
                                    </div>

                                    <div className="text-center p-4">
                                        <Counter target={30} className="block text-4xl font-bold text-blue-600 dark:text-blue-400" />
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Team<br />Members</span>
                                    </div>

                                    <div className="text-center p-4">
                                        <Counter target={15} className="block text-4xl font-bold text-blue-600 dark:text-blue-400" />
                                        <span className="text-gray-600 dark:text-gray-400 text-sm">Countries<br />Served</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call to Action */}
            <section className="py-24">
                <div className="container mx-auto px-6">
                    <div className="backdrop-blur-xl bg-gradient-to-r from-blue-600/90 to-blue-800/90 
                        dark:from-blue-600/20 dark:to-blue-800/20
                        rounded-3xl shadow-xl p-12 text-center
                        border border-white/20 dark:border-gray-600/20
                        shadow-lg shadow-blue-500/20 dark:shadow-blue-400/10
                        transition-all duration-500 relative overflow-hidden
                        animate-gradient-slow
                        after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_50%)]
                        dark:after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]">
                        <h2 className="text-3xl font-bold mb-8 text-white" data-aos="fade-up">Ready to Get Started?</h2>
                        <p className="text-xl text-gray-100 mb-8 max-w-2xl mx-auto" data-aos="fade-up" data-aos-delay="100">
                            Join thousands of developers who are already using AskQL to manage their databases smarter.
                        </p>
                        <Link 
                            to="/database"
                            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                            data-aos="fade-up"
                            data-aos-delay="200"
                        >
                            Start Building Now
                        </Link>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage; 