#ifndef ZOMBIE_SURVIVAL_GAME_H
#define ZOMBIE_SURVIVAL_GAME_H

#include <memory>
#include <random>
#include <string>
#include <iosfwd>
#include <vector>

class Character {
public:
    Character(std::string name, int health);
    virtual ~Character();

    virtual void takeDamage(int amount) = 0;
    virtual int attackPower() const = 0;
    virtual bool isAlive() const = 0;
    virtual void attack(Character& target) = 0;
    const std::string& name() const;

private:
    std::string name_;
};

class Zombie;

class Survivor final : public Character {
public:
    explicit Survivor(const std::string& name);
    Survivor(const std::string& name, int health, int maxHealth, int ammo,
             int scrap, int score, int kills);

    void takeDamage(int amount) override;
    int attackPower() const override;
    bool isAlive() const override;
    void attack(Character& target) override;
    void attack(Zombie& target);
    void attack(Zombie& target, bool heavy);
    bool heal(int amount);
    bool spendAmmo(int amount);
    void addAmmo(int amount);
    void addScrap(int amount);
    bool spendScrap(int amount);
    void addScore(int amount);
    void addKill();
    int health() const;
    int maxHealth() const;
    int ammo() const;
    int scrap() const;
    int score() const;
    int kills() const;
    void restoreHealth(int value);

private:
    int health_;
    int maxHealth_;
    int ammo_;
    int scrap_;
    int score_;
    int kills_;
};

std::ostream& operator<<(std::ostream& out, const Survivor& survivor);

class Zombie : public Character {
public:
    Zombie(std::string name, int health, int damage);
    ~Zombie() override;

    void takeDamage(int amount) override;
    int attackPower() const override;
    bool isAlive() const override;
    void attack(Character& target) override;
    virtual std::string kind() const;
    virtual void attack(Survivor& survivor, bool& defending) const;
    int health() const;

private:
    int health_;
    int damage_;
};

class ArmoredZombie final : public Zombie {
public:
    ArmoredZombie(std::string name, int health, int damage);
    using Zombie::attack;
    void takeDamage(int amount) override;
    std::string kind() const override;
    void attack(Survivor& survivor, bool& defending) const override;
};

class Item {
public:
    virtual ~Item();
    virtual std::string name() const = 0;
    virtual void use(Survivor& survivor) const = 0;
};

class Medkit final : public Item {
public:
    std::string name() const override;
    void use(Survivor& survivor) const override;
};

class AmmoPack final : public Item {
public:
    std::string name() const override;
    void use(Survivor& survivor) const override;
};

class Scrap final : public Item {
public:
    std::string name() const override;
    void use(Survivor& survivor) const override;
};

class Inventory {
public:
    Inventory();
    ~Inventory();
    Inventory(const Inventory&) = delete;
    Inventory& operator=(const Inventory&) = delete;

    void addMedkits(int count);
    void addAmmoPacks(int count);
    void addScrap(int count);
    bool useMedkit(Survivor& survivor);
    bool useAmmoPack(Survivor& survivor);
    int medkits() const;
    int ammoPacks() const;
    int scrapItems() const;
    bool craftMedkit(Survivor& survivor);
    bool craftAmmoPack(Survivor& survivor);
    void clear();

private:
    std::vector<std::unique_ptr<Item>> items_;
};

std::ostream& operator<<(std::ostream& out, const Inventory& inventory);

struct GameState {
    std::string playerName;
    int health = 100;
    int maxHealth = 100;
    int ammo = 12;
    int scrap = 0;
    int score = 0;
    int kills = 0;
    int medkits = 1;
    int ammoPacks = 1;
    int night = 1;
    bool inCombat = false;
    std::vector<std::string> zombieKinds;
    std::vector<int> zombieHealth;
};

class CombatSystem {
public:
    explicit CombatSystem(std::mt19937& random);
    void shoot(Survivor& survivor, Zombie& zombie);
    void melee(Survivor& survivor, Zombie& zombie);
    void enemiesAttack(Survivor& survivor,
                       const std::vector<std::unique_ptr<Zombie>>& zombies,
                       bool& defending);
    bool resolveKill(Survivor& survivor, const Zombie& zombie,
                     Inventory& inventory);
    bool allDefeated(const std::vector<std::unique_ptr<Zombie>>& zombies) const;

private:
    std::mt19937& random_;
};

class SaveManager {
public:
    static void save(const GameState& state, const std::string& path);
    static GameState load(const std::string& path);
    static void recordScore(const Survivor& survivor, int night,
                            const std::string& path);
    static void showLeaderboard(const std::string& path);
};

class Game {
public:
    Game();
    void run();

private:
    Survivor* survivor();
    void newGame();
    void resumeGame();
    void runCampaign();
    void prepareDaylight();
    void runNight();
    void runCombat();
    void startNight();
    void saveGame() const;
    GameState makeState() const;
    void restoreState(const GameState& state);
    void showStatus() const;
    void showMenu() const;
    void showNightIntro() const;
    void grantLoot();
    void finishRun(bool victory);
    std::vector<std::unique_ptr<Zombie>> createZombies(int count, int night);
    int readChoice(const std::string& prompt, int minimum, int maximum) const;
    std::string readLine(const std::string& prompt) const;
    bool paused_ = false;
    bool inCombat_ = false;
    int night_ = 1;
    Survivor survivor_;
    Inventory inventory_;
    std::vector<std::unique_ptr<Zombie>> zombies_;
    std::mt19937 random_;
};

#endif
