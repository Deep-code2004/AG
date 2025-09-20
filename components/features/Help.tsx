import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode; isOpen: boolean; onClick: () => void }> = ({ title, children, isOpen, onClick }) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <h2>
        <button
          type="button"
          className="flex items-center justify-between w-full p-5 font-medium text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={onClick}
          aria-expanded={isOpen}
        >
          <span>{title}</span>
          <svg className={`w-6 h-6 shrink-0 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </button>
      </h2>
      <div className={`${isOpen ? 'block' : 'hidden'} p-5 border-t border-gray-200 dark:border-gray-700`}>
        <div className="space-y-4 text-gray-600 dark:text-gray-400">
            {children}
        </div>
      </div>
    </div>
  );
};

const getHelpContent = (t: (key: string) => string) => ({
    guides: [
        { q: t('help.guides.q1'), a: t('help.guides.a1') },
        { q: t('help.guides.q2'), a: t('help.guides.a2') },
        { q: t('help.guides.q3'), a: t('help.guides.a3') },
        { q: t('help.guides.q4'), a: t('help.guides.a4') }
    ],
    faqs: [
        { q: t('help.faqsList.q1'), a: t('help.faqsList.a1') },
        { q: t('help.faqsList.q2'), a: t('help.faqsList.a2') },
        { q: t('help.faqsList.q3'), a: t('help.faqsList.a3') }
    ],
    troubleshooting: [
        { q: t('help.troubleshootingList.q1'), a: t('help.troubleshootingList.a1') },
        { q: t('help.troubleshootingList.q2'), a: t('help.troubleshootingList.a2') },
        { q: t('help.troubleshootingList.q3'), a: t('help.troubleshootingList.a3') }
    ]
});


export const Help: React.FC = () => {
    const { t } = useLanguage();
    const [openAccordion, setOpenAccordion] = useState<string | null>('guides');
    const content = getHelpContent(t);

    const toggleAccordion = (id: string) => {
        setOpenAccordion(openAccordion === id ? null : id);
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-lg shadow-md dark:bg-gray-800">
                <h2 className="text-3xl font-bold text-brand-green mb-6 dark:text-brand-light-green">{t('help.title')}</h2>

                <div className="space-y-2">
                    {/* Feature Guides */}
                    <AccordionItem
                        title={t('help.featureGuides')}
                        isOpen={openAccordion === 'guides'}
                        onClick={() => toggleAccordion('guides')}
                    >
                        {content.guides.map((item, index) => (
                            <div key={index} className="pb-4">
                                <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{item.q}</h4>
                                <p>{item.a}</p>
                            </div>
                        ))}
                    </AccordionItem>
                    
                    {/* FAQs */}
                     <AccordionItem
                        title={t('help.faqs')}
                        isOpen={openAccordion === 'faqs'}
                        onClick={() => toggleAccordion('faqs')}
                    >
                        {content.faqs.map((item, index) => (
                            <div key={index} className="pb-4">
                                <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{item.q}</h4>
                                <p>{item.a}</p>
                            </div>
                        ))}
                    </AccordionItem>

                    {/* Troubleshooting */}
                     <AccordionItem
                        title={t('help.troubleshooting')}
                        isOpen={openAccordion === 'troubleshooting'}
                        onClick={() => toggleAccordion('troubleshooting')}
                    >
                        {content.troubleshooting.map((item, index) => (
                            <div key={index} className="pb-4">
                                <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">{item.q}</h4>
                                <p>{item.a}</p>
                            </div>
                        ))}
                    </AccordionItem>
                </div>

            </div>
        </div>
    );
};
