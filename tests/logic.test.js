const assert = require('node:assert/strict');
const {getPlan,monthPlus,makeSchedule} = require('../logic.js');

const initial = {morph:'solid',size:'medium',number:'single',risk:'low',component:'unknown',factors:[],exclusions:[]};
const check = (updates={}) => getPlan({...initial,...updates});
const events = (updates={}) => check(updates).events.map(x=>[x.min,x.max,x.flag]);

assert.deepEqual(events({size:'small'}),[]);
assert.deepEqual(events({size:'small',risk:'high'}),[[12,12,'optional']]);
assert.deepEqual(events(),[[6,12,'required'],[18,24,'optional']]);
assert.deepEqual(events({risk:'high'}),[[6,12,'required'],[18,24,'required']]);
assert.deepEqual(events({number:'multiple'}),[[3,6,'required'],[18,24,'optional']]);
assert.deepEqual(events({number:'multiple',risk:'high'}),[[3,6,'required'],[18,24,'required']]);
assert.deepEqual(events({size:'large'}),[[3,3,'decision']]);
assert.deepEqual(events({size:'large',number:'multiple'}),[[3,6,'required'],[18,24,'optional']]);

assert.deepEqual(events({morph:'groundglass',size:'small'}),[]);
assert.deepEqual(events({morph:'groundglass',size:'small',risk:'high'}),[]);
assert.deepEqual(events({morph:'groundglass'}).slice(0,1),[[6,12,'required']]);
assert.deepEqual(events({morph:'groundglass',number:'multiple',size:'small'}),[[3,6,'required'],[24,24,'optional'],[48,48,'optional']]);
assert.deepEqual(events({morph:'groundglass',number:'multiple'}),[[3,6,'required']]);

assert.deepEqual(events({morph:'partsolid',size:'small'}),[]);
assert.deepEqual(events({morph:'partsolid',component:'unknown'}),[]);
assert.deepEqual(events({morph:'partsolid',component:'atleast6'}),[[3,6,'decision']]);
assert.equal(events({morph:'partsolid',component:'under6'}).length,6);
assert.deepEqual(events({morph:'partsolid',component:'under6'}).map(x=>x[0]),[3,12,24,36,48,60]);
assert.deepEqual(events({morph:'partsolid',number:'multiple',component:'under6'}),[[3,6,'required']]);
assert.equal(check({morph:'partsolid',number:'multiple',component:'atleast6'}).tone,'critical');
assert.equal(check({exclusions:['Imunossupressão']}).events.length,0);

// Low/high risk classification must never change any subsolid pathway.
for(const morph of ['groundglass','partsolid']){
  for(const size of ['small','medium','large']){
    for(const number of ['single','multiple']){
      for(const component of ['unknown','under6','atleast6']){
        const cfg={morph,size,number,component};
        assert.deepEqual(check({...cfg,risk:'low'}),check({...cfg,risk:'high'}));
      }
    }
  }
}

const baseline='2026-11';
assert.equal(monthPlus(baseline,3),'2027-02');
assert.equal(monthPlus('2026-12',12),'2027-12');
assert.equal(monthPlus('2026-01',-2),'2025-11');
assert.equal(monthPlus('x',12),null);

const sol=makeSchedule(check().events,baseline);
assert.equal(sol[0].from,'2027-05');
assert.equal(sol[0].to,'2027-11');
assert.equal(sol[1].from,'2028-05');
assert.equal(sol[1].to,'2028-11');

const ggnEvents=check({morph:'groundglass'}).events;
const ggn=makeSchedule(ggnEvents,baseline);
assert.deepEqual(ggn.map(x=>x.target),['2027-08','2029-08','2031-08']);
const ggnEarly=makeSchedule(ggnEvents,baseline,{'ggn-first':'2027-05'});
assert.deepEqual(ggnEarly.map(x=>x.target),['2027-05','2029-05','2031-05']);

for(const morph of ['solid','groundglass','partsolid']){
  for(const size of ['small','medium','large']){
    for(const number of ['single','multiple']){
      for(const risk of ['low','high']){
        const cfg={morph,size,number,risk,component:'under6'};
        const p=check(cfg);
        assert.equal(typeof p.title,'string');
        assert.ok(p.description.length>0);
        for(const event of makeSchedule(p.events,'2025-09')){
          assert.ok(event.from<=event.to);
          assert.ok(event.target>=event.from && event.target<=event.to);
        }
      }
    }
  }
}
console.log('Fleischner 2017: matriz, exceções e calendário validados (72 cenários + testes de regressão).');
