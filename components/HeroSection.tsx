import Image from 'next/image';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import heroIllustration from '@/public/assets/Gemini_Generated_Image_jlix6fjlix6fjlix (1) 1.png';

const steps = [
  {
    number: '1',
    title: 'Upload PDF',
    description: 'Add your book file',
  },
  {
    number: '2',
    title: 'AI Processing',
    description: 'We analyze the content',
  },
  {
    number: '3',
    title: 'Voice Chat',
    description: 'Discuss with AI',
  },
];

const HeroSection = () => {
  return (
    <section className="wrapper pt-28 mb-10 md:mb-16">
        <div className="library-hero-card">
      <div className="library-hero-content">
        <div className="library-hero-text">
          <div>
            <h1 className="library-hero-title">Your Library</h1>
            <p className="library-hero-description">
              Convert your books into interactive AI conversations.
              <br />
              Listen, learn, and discuss your favorite reads.
            </p>
          </div>

          <Link href="/books/new" className="library-cta-primary">
            <Plus className="size-5" strokeWidth={2.5} />
            <span>Add new book</span>
          </Link>
        </div>

        <div className="library-hero-illustration">
          <div className="library-hero-illustration-shell" aria-hidden="true">
            <Image
              src={heroIllustration}
              alt=""
              className="library-hero-illustration-svg"
              priority
            />
          </div>
        </div>

        <div className="library-steps-card">
          {steps.map((step) => (
            <div key={step.number} className="library-step-item">
              <div className="library-step-number">{step.number}</div>
              <div className="library-step-copy">
                <p className="library-step-title">{step.title}</p>
                <p className="library-step-description">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
        </div>
    </section>
  );
};

export default HeroSection;
