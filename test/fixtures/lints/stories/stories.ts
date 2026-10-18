// A stories file: its meta's component, and a story that covers another element beside it.
const meta = { title: 'Kit/Told', component: 'to-told' };
export default meta;
export const Also = { parameters: { covers: ['to-also'] } };
// component: 'to-untold' in a comment is not a story.
