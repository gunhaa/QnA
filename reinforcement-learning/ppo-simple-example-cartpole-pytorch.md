# PPO 알고리즘 가장 기본적인 예제 만드는 방법 (CartPole)

## 쉬운 설명

막대기를 손바닥 위에 세워서 안 넘어지게 균형 잡는 게임이 있어요. PPO는 그 게임을 스스로 수만 번 해보면서 "왼쪽/오른쪽 중 언제 밀어야 안 넘어지나"를 익히는 연습생이에요. 이 연습생을 훈련시키는 가장 간단한 방법은 딱 두 가지예요: ① 이미 잘 만들어진 훈련 프로그램을 그대로 빌려 쓰기, ② 훈련 원리를 직접 코드 몇 줄로 짜보기.

## 일반 설명

가장 기본적인 PPO 예제로는 **CartPole**(막대 균형 잡기, 상태 4개·행동 2개로 이루어진 가장 단순한 고전 제어 문제) 환경이 표준이다. 두 가지 난이도로 만들 수 있다.

### 방법 A — 기존 라이브러리로 3줄 완성 (가장 쉬움)

RL 알고리즘 구현체를 제공하는 **Stable-Baselines3**를 쓰면 PPO 내부 구현 없이 바로 학습이 가능하다.

```bash
pip install stable-baselines3 gymnasium
```

```python
import gymnasium as gym
from stable_baselines3 import PPO

env = gym.make("CartPole-v1")
model = PPO("MlpPolicy", env, verbose=1)
model.learn(total_timesteps=20_000)

# 학습된 정책 테스트
obs, _ = env.reset()
for _ in range(500):
    action, _ = model.predict(obs, deterministic=True)
    obs, reward, terminated, truncated, info = env.step(action)
    if terminated or truncated:
        obs, _ = env.reset()
```

- `verbose=1`로 학습 중 보상(reward)이 점점 올라가는 로그를 볼 수 있다.
- 내부적으로 PPO의 clipped objective, GAE, 가치 함수 손실이 전부 처리되어 있어, "PPO가 실제로 돌아가는 것"을 가장 빨리 확인하는 방법이다.

### 방법 B — PPO를 직접 구현 (원리 학습용)

앞서 설명한 clip objective를 최소 코드로 구현하면 다음과 같은 구조가 된다 (개념 골격, 실제 실행 시 보일러플레이트 일부 필요).

```bash
pip install torch gymnasium
```

```python
import torch, torch.nn as nn, gymnasium as gym
import numpy as np

env = gym.make("CartPole-v1")
obs_dim, act_dim = env.observation_space.shape[0], env.action_space.n

class ActorCritic(nn.Module):
    def __init__(self):
        super().__init__()
        self.shared = nn.Sequential(nn.Linear(obs_dim, 64), nn.Tanh())
        self.actor = nn.Linear(64, act_dim)   # 행동 확률(logits)
        self.critic = nn.Linear(64, 1)        # 상태 가치 V(s)

    def forward(self, x):
        h = self.shared(x)
        return self.actor(h), self.critic(h)

net = ActorCritic()
optimizer = torch.optim.Adam(net.parameters(), lr=3e-4)
eps_clip, gamma = 0.2, 0.99

for update in range(200):
    # 1) 롤아웃 수집 (현재 정책으로 에피소드 진행)
    obs, _ = env.reset()
    states, actions, rewards, old_logprobs, values = [], [], [], [], []
    done = False
    while not done:
        s = torch.tensor(obs, dtype=torch.float32)
        logits, value = net(s)
        dist = torch.distributions.Categorical(logits=logits)
        action = dist.sample()

        next_obs, reward, terminated, truncated, _ = env.step(action.item())
        done = terminated or truncated

        states.append(s); actions.append(action)
        rewards.append(reward); values.append(value)
        old_logprobs.append(dist.log_prob(action).detach())
        obs = next_obs

    # 2) 리턴(할인 누적 보상) 계산
    returns, R = [], 0
    for r in reversed(rewards):
        R = r + gamma * R
        returns.insert(0, R)
    returns = torch.tensor(returns, dtype=torch.float32)
    values = torch.cat(values).squeeze()
    advantages = returns - values.detach()

    # 3) PPO clipped objective로 수 epoch 업데이트
    for _ in range(4):
        logits, new_values = net(torch.stack(states))
        dist = torch.distributions.Categorical(logits=logits)
        new_logprobs = dist.log_prob(torch.stack(actions))

        ratio = torch.exp(new_logprobs - torch.stack(old_logprobs))
        surr1 = ratio * advantages
        surr2 = torch.clamp(ratio, 1 - eps_clip, 1 + eps_clip) * advantages
        policy_loss = -torch.min(surr1, surr2).mean()
        value_loss = (new_values.squeeze() - returns).pow(2).mean()

        loss = policy_loss + 0.5 * value_loss
        optimizer.zero_grad(); loss.backward(); optimizer.step()

    if update % 20 == 0:
        print(f"update {update}, episode reward = {sum(rewards):.0f}")
```

- 이 골격이 이전 답변([[ppo-algorithm-reward-design-alphastar]])에서 설명한 `L_CLIP`, advantage(`A_t`), ε(`eps_clip`) 파라미터가 실제 코드에서 어떻게 쓰이는지 보여준다.
- 실행하면 `episode reward`가 처음엔 20 근처(막대가 금방 넘어짐)에서 학습이 진행될수록 500(최대 길이)에 가까워지는 걸 볼 수 있다.

### "진짜 실행 파일(.exe)"로 묶고 싶다면

"바이너리"라는 표현을 문자 그대로 원한다면, 위 파이썬 스크립트를 **PyInstaller**로 패키징해 더블클릭 가능한 단일 실행 파일로 만들 수 있다.

```bash
pip install pyinstaller
pyinstaller --onefile ppo_cartpole.py
# dist/ppo_cartpole.exe 생성됨 (Windows 기준)
```

단, PyTorch/Gymnasium 같은 무거운 라이브러리가 통째로 함께 번들링되므로 결과 파일 용량이 수백 MB 단위로 커진다는 점은 감안해야 한다.

### 요약 비교

| 방법 | 난이도 | 목적 |
|---|---|---|
| Stable-Baselines3 | ★☆☆☆☆ | PPO가 실제로 동작하는지 가장 빨리 확인 |
| 직접 구현(PyTorch) | ★★★☆☆ | clip objective·advantage·GAE 등 내부 원리 학습 |
| PyInstaller 패키징 | ★★☆☆☆ | 위 둘 중 하나를 실제 .exe 파일로 배포 |

---

Sources:
- [PPO — Stable Baselines3 documentation](https://stable-baselines3.readthedocs.io/en/master/modules/ppo.html)
- [Getting Started — Stable Baselines3 documentation](https://stable-baselines3.readthedocs.io/en/master/guide/quickstart.html)
- [GitHub - DLR-RM/stable-baselines3](https://github.com/DLR-RM/stable-baselines3)
- [Proximal Policy Optimization (PPO) of the CartPole problem with PyTorch (gist)](https://gist.github.com/carlthome/542a9899dedcb2c7adf3403df3fe1f14)
- [GitHub - 4kasha/CartPole_PPO: CartPole-v0 via PPO with GAE, PyTorch](https://github.com/4kasha/CartPole_PPO)
- [GitHub - Chris-hughes10/simple-ppo](https://github.com/Chris-hughes10/simple-ppo)
