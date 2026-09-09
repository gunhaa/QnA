# 유전 알고리즘(Genetic Algorithm)이 뭐예요?

## 5살 아이에게 설명하듯이

옛날 옛적에 강아지 마을이 있었어요. 사람들은 "가장 빨리 달리는 강아지"를 원했어요. 그래서 이렇게 했어요.

1. 강아지 100마리를 아무렇게나 태어나게 해요 (**초기 집단, Initial Population**)
2. 달리기 시합을 시켜서 빠른 순서를 매겨요 (**적합도 평가, Fitness Evaluation**)
3. 잘 뛴 강아지들끼리 결혼시켜서 새끼를 낳아요 (**선택+교차, Selection & Crossover**)
4. 가끔 새끼한테 아주 작은 돌연변이를 줘요, 예를 들어 다리가 살짝 더 길어지거나 (**돌연변이, Mutation**)
5. 이걸 수백 세대 반복하면... 어느새 처음보다 훨씬 빨리 달리는 강아지들만 남아요!

이게 바로 **유전 알고리즘**이에요. 컴퓨터 안에서 "정답 후보들"을 강아지처럼 태어나게 하고, 잘하는 것끼리 짝지어주고, 가끔 랜덤하게 살짝 바꿔주면서, 세대를 거듭할수록 점점 더 좋은 답에 가까워지게 만드는 방법이에요. 1975년 존 홀랜드(John Holland)가 만든 대표적인 **진화 연산(Evolutionary Computation)** 기법입니다.

## 핵심 구성 요소

| 개념 | 설명 |
|---|---|
| **염색체 (Chromosome)** | 하나의 "정답 후보"를 숫자/문자열 형태로 표현한 것 |
| **개체군 (Population)** | 염색체(후보 해)들의 집합 |
| **적합도 함수 (Fitness Function)** | 이 후보가 얼마나 "좋은 답"인지 점수 매기는 함수 |
| **선택 (Selection)** | 적합도 높은 개체를 부모로 뽑는 과정 (룰렛휠, 토너먼트 방식 등) |
| **교차 (Crossover)** | 두 부모의 염색체를 섞어 자식을 만듦 |
| **돌연변이 (Mutation)** | 자식의 염색체 일부를 무작위로 바꿔 다양성 확보 |
| **세대 (Generation)** | 위 과정을 한 바퀴 도는 단위, 보통 수백~수천 세대 반복 |

## 직접 구현해서 "변화를 만드는" 프로그램을 만들 수 있냐면

**네, 충분히 가능합니다.** 오히려 유전 알고리즘은 딥러닝처럼 GPU나 방대한 데이터가 필요 없고, Python 표준 라이브러리(`random`)만으로도 몇십 줄이면 동작하는 프로그램을 만들 수 있어요. 아래는 "목표 문자열을 맞추는" 아주 고전적인 예제입니다 (사람들이 GA를 처음 배울 때 가장 많이 쓰는 예제이기도 해요).

```python
import random
import string

TARGET = "HELLO GENETIC"
POP_SIZE = 200
MUTATION_RATE = 0.01
GENES = string.ascii_uppercase + " "

def random_gene():
    return random.choice(GENES)

def create_individual():
    return [random_gene() for _ in range(len(TARGET))]

def fitness(individual):
    # TARGET 글자와 같은 위치 개수 = 적합도
    return sum(1 for a, b in zip(individual, TARGET) if a == b)

def crossover(parent1, parent2):
    point = random.randint(0, len(TARGET) - 1)
    return parent1[:point] + parent2[point:]

def mutate(individual):
    return [
        random_gene() if random.random() < MUTATION_RATE else gene
        for gene in individual
    ]

def select(population):
    # 토너먼트 선택: 무작위 5명 뽑아 그중 가장 적합도 높은 개체 선택
    contenders = random.sample(population, 5)
    return max(contenders, key=fitness)

def main():
    population = [create_individual() for _ in range(POP_SIZE)]
    generation = 0

    while True:
        population.sort(key=fitness, reverse=True)
        best = population[0]
        print(f"세대 {generation}: {''.join(best)} (적합도 {fitness(best)}/{len(TARGET)})")

        if fitness(best) == len(TARGET):
            break

        next_generation = population[:2]  # 엘리트 보존
        while len(next_generation) < POP_SIZE:
            parent1, parent2 = select(population), select(population)
            child = crossover(parent1, parent2)
            child = mutate(child)
            next_generation.append(child)

        population = next_generation
        generation += 1

if __name__ == "__main__":
    main()
```

실행하면 세대가 지날수록 랜덤한 글자 조합이 점점 `HELLO GENETIC`에 가까워지는 걸 눈으로 볼 수 있어요. 이게 유전 알고리즘이 "변화(진화)를 직접 만들어내는" 과정입니다.

## 예제가 많은 편이냐면

**네, 매우 많습니다.** 유전 알고리즘은 역사가 오래되고 구현이 단순해서 교육용/실전용 예제가 풍부해요.

- **방문 판매원 문제 (TSP, Traveling Salesman Problem)**: 여러 도시를 최단 경로로 도는 순서 찾기 — GA 응용 예제의 단골 메뉴
- **배낭 문제 (Knapsack Problem)**: 무게 제한 안에서 가치 최대화하는 물건 조합 찾기
- **N-퀸 문제**: 체스판에 퀸들을 서로 안 잡히게 배치하기
- **신경망 가중치 진화 (Neuroevolution, 예: NEAT)**: 딥러닝 역전파 대신 GA로 신경망 구조/가중치를 진화시키는 방법 — 게임 AI 학습에 자주 사용
- **하이퍼파라미터 튜닝**: 머신러닝 모델의 설정값 조합을 GA로 탐색
- **일정/스케줄링 최적화**: 공장 작업 순서, 교대 근무표 등 조합 최적화 문제

Python 생태계에는 `DEAP`, `PyGAD`, `geneticalgorithm` 같은 전용 라이브러리도 있어서, 위 예제처럼 직접 처음부터 짜지 않고도 빠르게 활용할 수 있습니다.

## 한 줄 요약

유전 알고리즘은 "좋은 답끼리 섞고, 가끔 랜덤하게 흔들어서, 세대를 거듭하며 더 나은 답을 찾는" 탐색 기법이며, 라이브러리 없이도 직접 구현 가능하고, TSP·배낭 문제·신경망 진화 등 실전 예제도 풍부합니다.

---

## 출처
- [유전 알고리즘 - 위키백과](https://ko.wikipedia.org/wiki/%EC%9C%A0%EC%A0%84_%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98)
- [basic genetic algorithm / 유전 알고리즘 입문 (예제) - Medium](https://medium.com/%EC%8A%AC%EA%B8%B0%EB%A1%9C%EC%9A%B4-%EA%B0%9C%EB%B0%9C%EC%83%9D%ED%99%9C/basic-genetic-algorithm-%EC%9C%A0%EC%A0%84-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-%EC%9E%85%EB%AC%B8-%EC%98%88%EC%A0%9C-332863a6edf9)
- [유전 알고리즘(Genetic Algorithm) - Data Science](https://yngie-c.github.io/machine%20learning/2020/09/07/genetic_algo/)
- [파이썬(Python) - 유전 알고리즘 기본 - baealex BLEX](https://blex.me/@baealex/%ED%8C%8C%EC%9D%B4%EC%8D%ACpython-%EC%9C%A0%EC%A0%84-%EC%95%8C%EA%B3%A0%EB%A6%AC%EC%A6%98-%EA%B8%B0%EB%B3%B8)
- [GitHub - pjt3591oo/python-gene](https://github.com/pjt3591oo/python-gene)
