(function () {
  const context = document.modelContext;
  if (!context || !context.registerTool) return;
  const lifecycle = new AbortController();
  const scenes = Array.from(document.querySelectorAll('.scn-card'));
  const names = scenes.map(button => button.querySelector('.scn-title').textContent);
  try {
    Promise.resolve(context.registerTool({
      name: 'configure_practice',
      title: '选择练习场景与时长',
      description: '在开始页选择英语练习场景和分钟数，不启动麦克风。',
      inputSchema: {type:'object',properties:{scenario:{type:'string',enum:names},minutes:{type:'integer',enum:[5,10,60]}},required:['scenario','minutes'],additionalProperties:false},
      annotations: {readOnlyHint:false,untrustedContentHint:false},
      execute(input) {
        if (!input || Object.keys(input).some(key => !['scenario','minutes'].includes(key)) || !names.includes(input.scenario) || ![5,10,60].includes(input.minutes)) throw new Error('Invalid practice selection');
        if (document.getElementById('screen-start').classList.contains('hidden')) throw new Error('Return to the start screen first');
        scenes[names.indexOf(input.scenario)].click();
        document.querySelector('.dur-btn[data-min="'+input.minutes+'"]').click();
        return {scenario:document.querySelector('.scn-card.selected .scn-title').textContent,minutes:Number(document.querySelector('.dur-btn.selected').dataset.min)};
      }
    }, {signal:lifecycle.signal})).catch(error => console.warn('Practice tools unavailable:',error.message));
    window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  } catch(error) { console.warn('Practice tools unavailable:',error.message); }
})();
