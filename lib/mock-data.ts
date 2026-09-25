import type {
  Challenge,
  Achievement,
  DayOfWeek,
} from './types';

const allDays: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

function makeTasks(
  dayNumber: number,
  titles: string[],
  baseDuration: number
): Array<{
  id: string;
  title: string;
  description: string;
  duration: number;
  completed: boolean;
}> {
  const validTitles = titles.filter((t): t is string => t !== undefined);
  const tasks = validTitles.map((title, i) => ({
    id: `task-${dayNumber}-${i}`,
    title,
    description: getTaskDescription(title),
    duration: i === 0 ? baseDuration : Math.round(baseDuration * 0.6),
    completed: dayNumber < 7 ? true : dayNumber === 7 ? i < 1 : false,
  }));
  return tasks;
}

function getTaskDescription(title: string): string {
  const descriptions: Record<string, string> = {
    'Career Inventory':
      'Review your previous experience and identify what you enjoyed most. List your roles, achievements, and skills gained.',
    'Identify Transferable Skills':
      'Map skills from your past that apply to your new direction. Think communication, problem-solving, leadership.',
    'Write Your Key Strengths':
      'Write down 5-7 strengths you can confidently talk about. Back each with a concrete example.',
    'Professional Positioning':
      'Define how you want to be perceived professionally. Write a one-sentence positioning statement.',
    'Professional Story':
      'Craft a compelling narrative about your career journey. Practice telling it in under 2 minutes.',
    'Interview Practice':
      'Record yourself answering common interview questions. Review and identify areas to improve.',
    'Resume Refresh':
      'Update your resume with your new positioning. Tailor it for the roles you are targeting.',
    'Network Audit':
      'Review your professional network. Identify 10 people who could help your transition.',
    'LinkedIn Optimization':
      'Update your LinkedIn headline, summary, and experience. Add a professional photo if needed.',
    'Skill Gap Analysis':
      'Identify the top 3 skills you need to develop. Research courses, books, or projects to build them.',
    'Personal Brand Workshop':
      'Define your personal brand attributes. Create a short bio and key messaging points.',
    'Salary Research':
      'Research salary ranges for your target roles. Factor in location, experience, and benefits.',
    'Goal Setting':
      'Set 3 clear career goals for the next 90 days. Make them specific, measurable, and time-bound.',
    'Action Plan':
      'Create a weekly action plan for the next month. Schedule specific tasks on your calendar.',
    'Reflection & Next Steps':
      'Review what you have learned and accomplished. Identify what to focus on next.',
  };
  return descriptions[title] || 'Complete this task as described and reflect on what you learned.';
}

function makeDay(
  dayNumber: number,
  title: string,
  goal: string,
  time: number,
  taskTitles: string[]
) {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    title,
    goal,
    estimatedTime: time,
    tasks: makeTasks(dayNumber, taskTitles, Math.round(time / taskTitles.length)),
    completed: dayNumber < 7,
  };
}

function buildCareerResetWeeks() {
  const week1 = {
    id: 'week-1',
    weekNumber: 1,
    title: 'Foundation',
    days: [
      makeDay(1, 'Career Inventory', 'Take stock of where you are and where you have been.', 45, [
        'Career Inventory',
        'Identify Transferable Skills',
        'Write Your Key Strengths',
      ]),
      makeDay(2, 'Professional Positioning', 'Define how you want to be perceived.', 60, [
        'Professional Positioning',
        'Resume Refresh',
      ]),
      makeDay(3, 'Your Professional Story', 'Craft a narrative that connects your past to your future.', 50, [
        'Professional Story',
        'Interview Practice',
      ]),
      makeDay(4, 'Network Audit', 'Map your network and identify key connections.', 40, [
        'Network Audit',
        'LinkedIn Optimization',
      ]),
      makeDay(5, 'Skill Gap Analysis', 'Identify what you need to learn and how to get there.', 55, [
        'Skill Gap Analysis',
        'Goal Setting',
      ]),
      makeDay(6, 'Personal Brand', 'Develop your personal brand and messaging.', 45, [
        'Personal Brand Workshop',
        'Salary Research',
      ]),
      makeDay(7, 'Professional Story', 'Refine your story and practice delivery.', 30, [
        'Professional Story',
        'Interview Practice',
      ]),
    ],
  };

  const week2 = {
    id: 'week-2',
    weekNumber: 2,
    title: 'Building Momentum',
    days: [
      makeDay(8, 'Resume Deep Dive', 'Polish your resume to perfection.', 60, [
        'Resume Refresh',
        'LinkedIn Optimization',
      ]),
      makeDay(9, 'Networking Strategy', 'Plan how to grow your network strategically.', 50, [
        'Network Audit',
        'Personal Brand Workshop',
      ]),
      makeDay(10, 'Interview Mastery', 'Practice advanced interview techniques.', 60, [
        'Interview Practice',
        'Professional Story',
      ]),
      makeDay(11, 'Skill Building', 'Start building your first identified skill gap.', 55, [
        'Skill Gap Analysis',
        'Goal Setting',
      ]),
      makeDay(12, 'Salary Negotiation', 'Learn negotiation strategies and practice them.', 45, [
        'Salary Research',
        'Personal Brand Workshop',
      ]),
      makeDay(13, 'Application Sprint', 'Prepare and submit 3 targeted applications.', 50, [
        'Resume Refresh',
        'Action Plan',
      ]),
      makeDay(14, 'Week 2 Review', 'Reflect on progress and adjust your plan.', 30, [
        'Reflection & Next Steps',
        'Goal Setting',
      ]),
    ],
  };

  const week3 = {
    id: 'week-3',
    weekNumber: 3,
    title: 'Acceleration',
    days: [
      makeDay(15, 'Advanced Interview Prep', 'Tackle behavioral and case interview questions.', 60, [
        'Interview Practice',
        'Professional Story',
      ]),
      makeDay(16, 'Networking Outreach', 'Reach out to 5 contacts and schedule conversations.', 45, [
        'Network Audit',
        'Action Plan',
      ]),
      makeDay(17, 'Portfolio Building', 'Document or create a project showcasing your skills.', 55, [
        'Skill Gap Analysis',
        'Personal Brand Workshop',
      ]),
      makeDay(18, 'Online Presence', 'Audit and improve your entire online presence.', 40, [
        'LinkedIn Optimization',
        'Personal Brand Workshop',
      ]),
      makeDay(19, 'Target Company Research', 'Research 5 target companies in depth.', 50, [
        'Salary Research',
        'Goal Setting',
      ]),
      makeDay(20, 'Mock Interview', 'Conduct a full mock interview and review.', 60, [
        'Interview Practice',
        'Reflection & Next Steps',
      ]),
      makeDay(21, 'Week 3 Review', 'Assess momentum and plan the final stretch.', 30, [
        'Reflection & Next Steps',
        'Action Plan',
      ]),
    ],
  };

  const week4 = {
    id: 'week-4',
    weekNumber: 4,
    title: 'Final Push',
    days: [
      makeDay(22, 'Application Blitz', 'Submit 5 high-quality applications.', 55, [
        'Resume Refresh',
        'Action Plan',
      ]),
      makeDay(23, 'Follow-Up Campaign', 'Follow up on all pending applications and conversations.', 40, [
        'Network Audit',
        'Action Plan',
      ]),
      makeDay(24, 'Advanced Networking', 'Attend or host a networking event.', 50, [
        'Network Audit',
        'Personal Brand Workshop',
      ]),
      makeDay(25, 'Final Interview Prep', 'Run through a complete interview simulation.', 60, [
        'Interview Practice',
        'Professional Story',
      ]),
      makeDay(26, 'Offer Evaluation', 'Learn to evaluate and compare job offers.', 45, [
        'Salary Research',
        'Goal Setting',
      ]),
      makeDay(27, 'Career Roadmap', 'Create a 6-month career roadmap.', 50, [
        'Action Plan',
        'Goal Setting',
      ]),
      makeDay(28, 'Final Review', 'Celebrate progress and plan your next challenge.', 30, [
        'Reflection & Next Steps',
      ]),
    ],
  };

  const week5 = {
    id: 'week-5',
    weekNumber: 5,
    title: 'Completion',
    days: [
      makeDay(29, 'Knowledge Consolidation', 'Review everything you have learned and document it.', 45, [
        'Reflection & Next Steps',
        'Goal Setting',
      ]),
      makeDay(30, 'Celebrate & Plan', 'Celebrate your achievement and plan your next challenge.', 30, [
        'Reflection & Next Steps',
        'Action Plan',
      ]),
    ],
  };

  return [week1, week2, week3, week4, week5];
}

export const activeChallenge: Challenge = {
  id: 'challenge-active-1',
  title: '30-Day Career Reset',
  description:
    'A comprehensive career transition challenge covering positioning, networking, interviewing, and application strategy.',
  goal:
    'Build practical skills and become confident enough to apply them in real situations.',
  status: 'active',
  duration: 30,
  timePerDay: 60,
  intensity: 'balanced',
  preferredDays: allDays,
  startTime: '10:00',
  weeks: buildCareerResetWeeks(),
  currentDay: 7,
  createdAt: '2025-09-18T10:00:00Z',
  startDate: '2025-09-18T10:00:00Z',
  completedTasks: 24,
  totalTasks: 0,
  timeInvestedMinutes: 520,
  streak: 6,
};

export const completedChallenges: Challenge[] = [
  {
    id: 'challenge-completed-1',
    title: '21-Day Public Speaking',
    description:
      'Overcome fear of public speaking through daily practice exercises and gradual exposure.',
    goal: 'Speak confidently in front of any audience without anxiety.',
    status: 'completed',
    duration: 21,
    timePerDay: 30,
    intensity: 'light',
    preferredDays: allDays,
    startTime: '08:00',
    weeks: [],
    currentDay: 21,
    createdAt: '2025-08-10T08:00:00Z',
    startDate: '2025-08-10T08:00:00Z',
    completedTasks: 42,
    totalTasks: 42,
    timeInvestedMinutes: 630,
    streak: 21,
  },
  {
    id: 'challenge-completed-2',
    title: '14-Day Fitness Kickstart',
    description:
      'Build a daily exercise habit with progressive bodyweight workouts and mobility work.',
    goal: 'Establish a consistent daily exercise routine.',
    status: 'completed',
    duration: 14,
    timePerDay: 45,
    intensity: 'intensive',
    preferredDays: allDays,
    startTime: '07:00',
    weeks: [],
    currentDay: 14,
    createdAt: '2025-07-15T07:00:00Z',
    startDate: '2025-07-15T07:00:00Z',
    completedTasks: 28,
    totalTasks: 28,
    timeInvestedMinutes: 630,
    streak: 14,
  },
];

export const draftChallenges: Challenge[] = [
  {
    id: 'challenge-draft-1',
    title: '30-Day Spanish Basics',
    description:
      'Learn essential Spanish vocabulary and grammar through daily structured practice.',
    goal: 'Hold a basic conversation in Spanish.',
    status: 'draft',
    duration: 30,
    timePerDay: 30,
    intensity: 'light',
    preferredDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '19:00',
    weeks: [],
    currentDay: 0,
    createdAt: '2025-09-20T19:00:00Z',
    completedTasks: 0,
    totalTasks: 0,
    timeInvestedMinutes: 0,
    streak: 0,
  },
];

export const allChallenges: Challenge[] = [
  activeChallenge,
  ...completedChallenges,
  ...draftChallenges,
];

export const achievements: Achievement[] = [
  {
    id: 'ach-1',
    title: 'First Challenge',
    description: 'Completed your first challenge',
    icon: 'trophy',
    unlocked: true,
    unlockedAt: '2025-08-31T08:00:00Z',
  },
  {
    id: 'ach-2',
    title: '7-Day Streak',
    description: 'Maintained a 7-day streak',
    icon: 'flame',
    unlocked: true,
    unlockedAt: '2025-09-25T10:00:00Z',
  },
  {
    id: 'ach-3',
    title: '10 Tasks Completed',
    description: 'Completed 10 individual tasks',
    icon: 'star',
    unlocked: true,
    unlockedAt: '2025-09-20T10:00:00Z',
  },
  {
    id: 'ach-4',
    title: '25% Complete',
    description: 'Reached 25% completion on a challenge',
    icon: 'target',
    unlocked: true,
    unlockedAt: '2025-09-22T10:00:00Z',
  },
  {
    id: 'ach-5',
    title: '14-Day Streak',
    description: 'Maintained a 14-day streak',
    icon: 'flame',
    unlocked: false,
  },
  {
    id: 'ach-6',
    title: '50% Complete',
    description: 'Reached 50% completion on a challenge',
    icon: 'gem',
    unlocked: false,
  },
  {
    id: 'ach-7',
    title: '30 Tasks Completed',
    description: 'Completed 30 individual tasks',
    icon: 'rocket',
    unlocked: false,
  },
  {
    id: 'ach-8',
    title: 'Challenge Master',
    description: 'Completed 3 challenges',
    icon: 'crown',
    unlocked: false,
  },
];

export const generatedPlanChallenge: Challenge = {
  id: 'challenge-preview-1',
  title: '30-Day Career Reset',
  description:
    'A comprehensive career transition challenge covering positioning, networking, interviewing, and application strategy.',
  goal:
    'Build practical skills and become confident enough to apply them in real situations.',
  status: 'draft',
  duration: 30,
  timePerDay: 60,
  intensity: 'balanced',
  preferredDays: allDays,
  startTime: '10:00',
  weeks: buildCareerResetWeeks(),
  currentDay: 0,
  createdAt: new Date().toISOString(),
  completedTasks: 0,
  totalTasks: 0,
  timeInvestedMinutes: 0,
  streak: 0,
};

export const calendarData: { day: number; completed: boolean; date: string }[] =
  Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    completed: i < 6,
    date: new Date(2025, 8, 18 + i).toISOString(),
  }));
