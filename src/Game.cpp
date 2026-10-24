#include "Game.h"

#include <algorithm>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace {
constexpr int kInitialHealth = 100;
constexpr int kMaxAmmo = 60;
constexpr int kAmmoCraftCost = 3;
constexpr int kMedkitCraftCost = 4;
constexpr const char* kSavePath = "zombie_save.txt";
constexpr const char* kLeaderboardPath = "leaderboard.txt";

std::unique_ptr<Zombie> makeZombie(const std::string& kind, int health,
                                   int night, std::size_t index) {
    const int damage = 7 + night * 2;
    const std::string name = kind == "Armored"
                                 ? "Armored Walker " + std::to_string(index)
                                 : "Walker " + std::to_string(index);
    if (kind == "Armored") {
        return std::make_unique<ArmoredZombie>(name, health, damage + 2);
    }
    return std::make_unique<Zombie>(name, health, damage);
}
}

Character::Character(std::string name, int) : name_(std::move(name)) {}
Character::~Character() = default;
const std::string& Character::name() const { return name_; }

Survivor::Survivor(const std::string& name)
    : Survivor(name, kInitialHealth, kInitialHealth, 12, 0, 0, 0) {}

Survivor::Survivor(const std::string& name, int health, int maxHealth, int ammo,
                   int scrap, int score, int kills)
    : Character(name, health),
      health_(std::clamp(health, 0, std::max(1, maxHealth))),
      maxHealth_(std::max(1, maxHealth)), ammo_(std::clamp(ammo, 0, kMaxAmmo)),
      scrap_(std::max(0, scrap)), score_(std::max(0, score)),
      kills_(std::max(0, kills)) {}

void Survivor::takeDamage(int amount) {
    health_ = std::max(0, health_ - std::max(0, amount));
}
int Survivor::attackPower() const { return 12; }
bool Survivor::isAlive() const { return health_ > 0; }
void Survivor::attack(Character& target) { target.takeDamage(attackPower()); }
void Survivor::attack(Zombie& target) { attack(target, false); }
void Survivor::attack(Zombie& target, bool heavy) {
    target.takeDamage(attackPower() + (heavy ? 7 : 0));
}
bool Survivor::heal(int amount) {
    if (amount <= 0 || health_ >= maxHealth_ || !isAlive()) return false;
    health_ = std::min(maxHealth_, health_ + amount);
    return true;
}
bool Survivor::spendAmmo(int amount) {
    if (amount <= 0 || ammo_ < amount) return false;
    ammo_ -= amount;
    return true;
}
void Survivor::addAmmo(int amount) { ammo_ = std::clamp(ammo_ + amount, 0, kMaxAmmo); }
void Survivor::addScrap(int amount) { scrap_ += std::max(0, amount); }
bool Survivor::spendScrap(int amount) {
    if (amount <= 0 || scrap_ < amount) return false;
    scrap_ -= amount;
    return true;
}
void Survivor::addScore(int amount) { score_ += std::max(0, amount); }
void Survivor::addKill() { ++kills_; }
int Survivor::health() const { return health_; }
int Survivor::maxHealth() const { return maxHealth_; }
int Survivor::ammo() const { return ammo_; }
int Survivor::scrap() const { return scrap_; }
int Survivor::score() const { return score_; }
int Survivor::kills() const { return kills_; }
void Survivor::restoreHealth(int value) { health_ = std::clamp(value, 0, maxHealth_); }

std::ostream& operator<<(std::ostream& out, const Survivor& survivor) {
    out << survivor.name() << " | HP " << survivor.health() << '/'
        << survivor.maxHealth() << " | Ammo " << survivor.ammo()
        << " | Scrap " << survivor.scrap() << " | Score " << survivor.score()
        << " | Kills " << survivor.kills();
    return out;
}

Zombie::Zombie(std::string name, int health, int damage)
    : Character(std::move(name), health), health_(std::max(0, health)),
      damage_(std::max(0, damage)) {}
Zombie::~Zombie() = default;
void Zombie::takeDamage(int amount) { health_ = std::max(0, health_ - std::max(0, amount)); }
int Zombie::attackPower() const { return damage_; }
bool Zombie::isAlive() const { return health_ > 0; }
void Zombie::attack(Character& target) {
    target.takeDamage(attackPower());
}
std::string Zombie::kind() const { return "Normal"; }
void Zombie::attack(Survivor& survivor, bool& defending) const {
    int damage = attackPower();
    if (defending) damage = (damage + 1) / 2;
    survivor.takeDamage(damage);
    std::cout << name() << " hits for " << damage << " damage.\n";
}
int Zombie::health() const { return health_; }

ArmoredZombie::ArmoredZombie(std::string name, int health, int damage)
    : Zombie(std::move(name), health, damage) {}
void ArmoredZombie::takeDamage(int amount) { Zombie::takeDamage((std::max(0, amount) + 1) / 2); }
std::string ArmoredZombie::kind() const { return "Armored"; }
void ArmoredZombie::attack(Survivor& survivor, bool& defending) const {
    const int damage = defending ? (attackPower() + 3) / 4 : attackPower() + 3;
    survivor.takeDamage(damage);
    std::cout << name() << " lunges through the barricade for " << damage
              << " damage.\n";
}

Item::~Item() = default;
std::string Medkit::name() const { return "Medkit"; }
void Medkit::use(Survivor& survivor) const {
    if (!survivor.heal(35)) throw std::logic_error("Health is already full.");
}
std::string AmmoPack::name() const { return "Ammo pack"; }
void AmmoPack::use(Survivor& survivor) const { survivor.addAmmo(10); }
std::string Scrap::name() const { return "Scrap"; }
void Scrap::use(Survivor& survivor) const { survivor.addScrap(1); }

Inventory::Inventory() = default;
Inventory::~Inventory() = default;
void Inventory::addMedkits(int count) {
    for (int i = 0; i < count; ++i) items_.push_back(std::make_unique<Medkit>());
}
void Inventory::addAmmoPacks(int count) {
    for (int i = 0; i < count; ++i) items_.push_back(std::make_unique<AmmoPack>());
}
void Inventory::addScrap(int count) {
    for (int i = 0; i < count; ++i) items_.push_back(std::make_unique<Scrap>());
}
bool Inventory::useMedkit(Survivor& survivor) {
    const auto item = std::find_if(items_.begin(), items_.end(), [](const auto& value) {
        return value->name() == "Medkit";
    });
    if (item == items_.end()) return false;
    (*item)->use(survivor);
    items_.erase(item);
    return true;
}
bool Inventory::useAmmoPack(Survivor& survivor) {
    const auto item = std::find_if(items_.begin(), items_.end(), [](const auto& value) {
        return value->name() == "Ammo pack";
    });
    if (item == items_.end()) return false;
    (*item)->use(survivor);
    items_.erase(item);
    return true;
}
int Inventory::medkits() const {
    return static_cast<int>(std::count_if(items_.begin(), items_.end(), [](const auto& item) {
        return item->name() == "Medkit";
    }));
}
int Inventory::ammoPacks() const {
    return static_cast<int>(std::count_if(items_.begin(), items_.end(), [](const auto& item) {
        return item->name() == "Ammo pack";
    }));
}
int Inventory::scrapItems() const {
    return static_cast<int>(std::count_if(items_.begin(), items_.end(), [](const auto& item) {
        return item->name() == "Scrap";
    }));
}
bool Inventory::craftMedkit(Survivor& survivor) {
    if (scrapItems() < kMedkitCraftCost) return false;
    if (!survivor.spendScrap(kMedkitCraftCost)) return false;
    for (int i = 0; i < kMedkitCraftCost; ++i) {
        const auto scrap = std::find_if(items_.begin(), items_.end(), [](const auto& item) {
            return item->name() == "Scrap";
        });
        if (scrap == items_.end()) throw std::logic_error("Scrap inventory is out of sync.");
        items_.erase(scrap);
    }
    addMedkits(1);
    return true;
}
bool Inventory::craftAmmoPack(Survivor& survivor) {
    if (scrapItems() < kAmmoCraftCost) return false;
    if (!survivor.spendScrap(kAmmoCraftCost)) return false;
    for (int i = 0; i < kAmmoCraftCost; ++i) {
        const auto scrap = std::find_if(items_.begin(), items_.end(), [](const auto& item) {
            return item->name() == "Scrap";
        });
        if (scrap == items_.end()) throw std::logic_error("Scrap inventory is out of sync.");
        items_.erase(scrap);
    }
    addAmmoPacks(1);
    return true;
}
void Inventory::clear() { items_.clear(); }
std::ostream& operator<<(std::ostream& out, const Inventory& inventory) {
    out << "Medkits: " << inventory.medkits() << " | Ammo packs: "
        << inventory.ammoPacks() << " | Scrap pieces: " << inventory.scrapItems();
    return out;
}

CombatSystem::CombatSystem(std::mt19937& random) : random_(random) {}
void CombatSystem::shoot(Survivor& survivor, Zombie& zombie) {
    if (!survivor.spendAmmo(1)) throw std::logic_error("Out of ammunition.");
    std::uniform_int_distribution<int> damage(18, 27);
    const int hit = damage(random_);
    zombie.takeDamage(hit);
    std::cout << "You fire a shot at " << zombie.name() << " for " << hit
              << " damage";
    if (zombie.kind() == "Armored") std::cout << " (armor absorbs half)";
    std::cout << ".\n";
}
void CombatSystem::melee(Survivor& survivor, Zombie& zombie) {
    survivor.attack(zombie, true);
    std::cout << "You land a heavy melee strike on " << zombie.name()
              << " for " << survivor.attackPower() + 7
              << " base damage.\n";
}
void CombatSystem::enemiesAttack(
    Survivor& survivor, const std::vector<std::unique_ptr<Zombie>>& zombies,
    bool& defending) {
    for (const auto& zombie : zombies) {
        if (zombie->isAlive() && survivor.isAlive()) zombie->attack(survivor, defending);
    }
}
bool CombatSystem::resolveKill(Survivor& survivor, const Zombie& zombie,
                               Inventory& inventory) {
    if (zombie.isAlive()) return false;
    survivor.addKill();
    survivor.addScore(zombie.kind() == "Armored" ? 150 : 100);
    const int materials = zombie.kind() == "Armored" ? 2 : 1;
    survivor.addScrap(materials);
    inventory.addScrap(materials);
    std::cout << zombie.name() << " is defeated! +"
              << (zombie.kind() == "Armored" ? 150 : 100)
              << " score, crafting materials recovered.\n";
    return true;
}
bool CombatSystem::allDefeated(
    const std::vector<std::unique_ptr<Zombie>>& zombies) const {
    return std::none_of(zombies.begin(), zombies.end(),
                        [](const auto& zombie) { return zombie->isAlive(); });
}

void SaveManager::save(const GameState& state, const std::string& path) {
    std::ofstream file(path, std::ios::trunc);
    if (!file) throw std::runtime_error("Could not open save file for writing.");
    file << "ZSL1\n" << std::quoted(state.playerName) << '\n'
         << state.health << ' ' << state.maxHealth << ' ' << state.ammo << ' '
         << state.scrap << ' ' << state.score << ' ' << state.kills << ' '
         << state.medkits << ' ' << state.ammoPacks << ' ' << state.night << ' '
         << state.inCombat << '\n' << state.zombieKinds.size() << '\n';
    for (std::size_t i = 0; i < state.zombieKinds.size(); ++i) {
        file << state.zombieKinds[i] << ' ' << state.zombieHealth.at(i) << '\n';
    }
    if (!file) throw std::runtime_error("Writing the save file failed.");
    std::cout << "Game saved to " << path << ".\n";
}

GameState SaveManager::load(const std::string& path) {
    std::fstream file(path, std::ios::in);
    if (!file) throw std::runtime_error("No readable save file was found.");
    GameState state;
    std::string version;
    std::size_t zombieCount = 0;
    if (!(file >> version) || version != "ZSL1" ||
        !(file >> std::quoted(state.playerName) >>
          state.health >> state.maxHealth >> state.ammo >> state.scrap >>
          state.score >> state.kills >> state.medkits >> state.ammoPacks >>
          state.night >> state.inCombat >> zombieCount)) {
        throw std::runtime_error("Save file is corrupt or has an unsupported version.");
    }
    if (state.playerName.empty() || state.playerName.size() > 40 ||
        state.maxHealth < 1 || state.maxHealth > 500 || state.health < 0 ||
        state.health > state.maxHealth || state.ammo < 0 || state.ammo > kMaxAmmo ||
        state.scrap < 0 || state.scrap > 10000 || state.score < 0 ||
        state.kills < 0 || state.medkits < 0 || state.medkits > 100 ||
        state.ammoPacks < 0 || state.ammoPacks > 100 || state.night < 1 ||
        state.night > 3 || zombieCount > 30 ||
        (state.inCombat && zombieCount == 0) || (!state.inCombat && zombieCount != 0)) {
        throw std::runtime_error("Save file contains invalid player or game state.");
    }
    for (std::size_t i = 0; i < zombieCount; ++i) {
        std::string kind;
        int health = 0;
        if (!(file >> kind >> health) || (kind != "Normal" && kind != "Armored") ||
            health < 0 || health > (kind == "Armored" ? 45 + state.night * 8
                                                       : 30 + state.night * 7)) {
            throw std::runtime_error("Save file contains invalid enemy data.");
        }
        state.zombieKinds.push_back(kind);
        state.zombieHealth.push_back(health);
    }
    std::string extra;
    if (file >> extra) throw std::runtime_error("Save file has unexpected trailing data.");
    return state;
}

void SaveManager::recordScore(const Survivor& survivor, int night,
                              const std::string& path) {
    std::ofstream file(path, std::ios::app);
    if (!file) throw std::runtime_error("Could not open leaderboard for writing.");
    file << std::quoted(survivor.name()) << ' ' << survivor.score() << ' '
         << survivor.kills() << ' ' << night << '\n';
    if (!file) throw std::runtime_error("Writing the leaderboard failed.");
}
void SaveManager::showLeaderboard(const std::string& path) {
    std::ifstream file(path);
    if (!file) {
        std::cout << "No completed runs have been recorded yet.\n";
        return;
    }
    struct Entry { std::string name; int score; int kills; int night; };
    std::vector<Entry> entries;
    Entry entry;
    while (file >> std::quoted(entry.name) >> entry.score >> entry.kills >> entry.night) {
        if (entry.name.size() <= 40 && entry.score >= 0 && entry.kills >= 0 &&
            entry.night >= 1 && entry.night <= 3) entries.push_back(entry);
    }
    if (file.bad()) throw std::runtime_error("Could not read leaderboard file.");
    std::sort(entries.begin(), entries.end(), [](const Entry& a, const Entry& b) {
        if (a.score != b.score) return a.score > b.score;
        return a.kills > b.kills;
    });
    std::cout << "\n========== TOP SURVIVORS ==========\n";
    if (entries.empty()) std::cout << "No valid completed runs found.\n";
    for (std::size_t i = 0; i < std::min<std::size_t>(10, entries.size()); ++i) {
        std::cout << std::setw(2) << i + 1 << ". " << entries[i].name
                  << " | " << entries[i].score << " pts | "
                  << entries[i].kills << " kills | reached night "
                  << entries[i].night << '\n';
    }
    std::cout << "===================================\n";
}

Game::Game()
    : survivor_("Survivor"), random_(std::random_device{}()) {}

void Game::run() {
    bool running = true;
    while (running) {
        showMenu();
        const int choice = readChoice("Choose an option: ", 1, 4);
        try {
            switch (choice) {
            case 1: newGame(); runCampaign(); break;
            case 2: resumeGame(); runCampaign(); break;
            case 3: SaveManager::showLeaderboard(kLeaderboardPath); break;
            case 4: running = false; break;
            default: break;
            }
        } catch (const std::exception& error) {
            if (std::string(error.what()) == "Input ended.") {
                running = false;
                continue;
            }
            std::cout << "\n[!] " << error.what() << "\n";
        }
    }
    std::cout << "Stay safe out there.\n";
}

Survivor* Game::survivor() { return &survivor_; }

void Game::newGame() {
    const std::string name = readLine("Enter your survivor name: ");
    if (name.empty() || name.size() > 40) {
        throw std::invalid_argument("Name must contain 1 to 40 characters.");
    }
    survivor_ = Survivor(name);
    inventory_.clear();
    inventory_.addMedkits(1);
    inventory_.addAmmoPacks(1);
    night_ = 1;
    inCombat_ = false;
    paused_ = false;
    zombies_.clear();
    std::cout << "\nWelcome, " << name
              << ". Three nights stand between you and the evacuation zone.\n";
}

void Game::resumeGame() {
    const GameState state = SaveManager::load(kSavePath);
    restoreState(state);
    paused_ = false;
    std::cout << "\nWelcome back, " << survivor_.name() << ". Your run resumes at ";
    if (inCombat_) std::cout << "Night " << night_ << " combat.\n";
    else std::cout << "Night " << night_ << " daylight preparation.\n";
}

void Game::restoreState(const GameState& state) {
    survivor_ = Survivor(state.playerName, state.health, state.maxHealth,
                         state.ammo, state.scrap, state.score, state.kills);
    inventory_.clear();
    inventory_.addMedkits(state.medkits);
    inventory_.addAmmoPacks(state.ammoPacks);
    inventory_.addScrap(state.scrap);
    night_ = state.night;
    inCombat_ = state.inCombat;
    paused_ = false;
    zombies_.clear();
    for (std::size_t i = 0; i < state.zombieKinds.size(); ++i) {
        const int totalHealth = state.zombieKinds[i] == "Armored"
                                    ? 45 + night_ * 8 : 30 + night_ * 7;
        auto zombie = makeZombie(state.zombieKinds[i], totalHealth, night_, i + 1);
        zombie->takeDamage(totalHealth - state.zombieHealth[i]);
        zombies_.push_back(std::move(zombie));
    }
}

void Game::runCampaign() {
    if (paused_) return;
    while (survivor_.isAlive() && night_ <= 3) {
        if (!inCombat_) prepareDaylight();
        if (paused_) return;
        if (!survivor_.isAlive()) break;
        if (!inCombat_) startNight();
        runNight();
        if (paused_) return;
        if (!survivor_.isAlive()) break;
        grantLoot();
        inCombat_ = false;
        zombies_.clear();
        if (night_ < 3) {
            ++night_;
            std::cout << "\nNight " << night_ << " is approaching. The horde grows stronger.\n";
        } else {
            ++night_;
        }
    }
    if (!survivor_.isAlive()) finishRun(false);
    else if (night_ > 3) finishRun(true);
    paused_ = false;
}

void Game::prepareDaylight() {
    bool ready = false;
    while (!ready && survivor_.isAlive()) {
        std::cout << "\n========== DAYLIGHT: NIGHT " << night_ << " ==========\n";
        showStatus();
        std::cout << "1. Rest (+20 health)  2. Craft  3. Inventory  "
                     "4. Save  5. Begin the night\n";
        const int choice = readChoice("Choose: ", 1, 5);
        try {
            switch (choice) {
            case 1:
                if (survivor_.heal(20)) std::cout << "You rest and recover health.\n";
                else std::cout << "You are already at full health.\n";
                break;
            case 2: {
                std::cout << "Craft: 1. Medkit (4 scrap)  2. Ammo pack (3 scrap)  3. Back\n";
                const int craft = readChoice("Choose: ", 1, 3);
                if (craft == 1) {
                    if (inventory_.craftMedkit(survivor_)) std::cout << "Medkit crafted.\n";
                    else std::cout << "Not enough scrap (need 4).\n";
                } else if (craft == 2) {
                    if (inventory_.craftAmmoPack(survivor_)) std::cout << "Ammo pack crafted.\n";
                    else std::cout << "Not enough scrap (need 3).\n";
                }
                break;
            }
            case 3: std::cout << inventory_ << '\n'; break;
            case 4: saveGame(); paused_ = true; return;
            case 5: ready = true; break;
            default: break;
            }
        } catch (const std::exception& error) {
            std::cout << "[!] " << error.what() << '\n';
        }
    }
}

void Game::startNight() {
    inCombat_ = true;
    zombies_ = createZombies(2 + night_, night_);
    showNightIntro();
}

void Game::runNight() { runCombat(); }

void Game::runCombat() {
    CombatSystem combat(random_);
    bool defending = false;
    while (survivor_.isAlive() && !combat.allDefeated(zombies_)) {
        std::cout << "\n--------------- NIGHT " << night_ << " COMBAT ---------------\n";
        showStatus();
        for (std::size_t i = 0; i < zombies_.size(); ++i) {
            const Zombie& zombie = *zombies_[i];
            if (zombie.isAlive()) {
                std::cout << i + 1 << ". " << zombie.name() << " ["
                          << zombie.kind() << "] HP " << zombie.health() << '\n';
            }
        }
        std::cout << "1. Shoot  2. Heavy melee  3. Use medkit  4. Defend  "
                     "5. Use ammo pack  6. Inventory  7. Save and return to menu\n";
        const int action = readChoice("Action: ", 1, 7);
        if (action == 6) {
            std::cout << inventory_ << '\n';
            continue;
        }
        if (action == 7) {
            saveGame();
            paused_ = true;
            return;
        }
        try {
            if (action == 1 || action == 2) {
                std::vector<std::size_t> available;
                for (std::size_t i = 0; i < zombies_.size(); ++i) {
                    if (zombies_[i]->isAlive()) available.push_back(i);
                }
                std::cout << "Select a target:\n";
                for (std::size_t i = 0; i < available.size(); ++i) {
                    const Zombie& zombie = *zombies_[available[i]];
                    std::cout << i + 1 << ". " << zombie.name() << " ["
                              << zombie.kind() << "] HP " << zombie.health() << '\n';
                }
                const int target = readChoice("Target: ", 1, static_cast<int>(available.size()));
                Zombie& enemy = *zombies_[available[static_cast<std::size_t>(target - 1)]];
                if (action == 1) combat.shoot(survivor_, enemy);
                else combat.melee(survivor_, enemy);
                combat.resolveKill(survivor_, enemy, inventory_);
            } else if (action == 3) {
                if (!inventory_.useMedkit(survivor_)) {
                    std::cout << (inventory_.medkits() == 0 ? "No medkits left.\n"
                                                             : "You cannot use a medkit now.\n");
                    continue;
                }
                std::cout << "Medkit used. Health restored by up to 35.\n";
            } else if (action == 5) {
                if (!inventory_.useAmmoPack(survivor_)) {
                    std::cout << "No ammo packs left.\n";
                    continue;
                }
                std::cout << "Ammo pack used. You recover 10 rounds, up to the 60-round limit.\n";
            } else {
                defending = true;
                std::cout << "You brace for impact. Incoming damage is reduced this turn.\n";
            }
            if (survivor_.isAlive() && !combat.allDefeated(zombies_)) {
                combat.enemiesAttack(survivor_, zombies_, defending);
                defending = false;
            }
        } catch (const std::exception& error) {
            std::cout << "[!] " << error.what() << '\n';
            continue;
        }
    }
    if (survivor_.isAlive()) {
        std::cout << "\nThe last zombie collapses. You survived Night " << night_ << "!\n";
    }
}

void Game::saveGame() const {
    SaveManager::save(makeState(), kSavePath);
}

GameState Game::makeState() const {
    GameState state;
    state.playerName = survivor_.name();
    state.health = survivor_.health();
    state.maxHealth = survivor_.maxHealth();
    state.ammo = survivor_.ammo();
    state.scrap = survivor_.scrap();
    state.score = survivor_.score();
    state.kills = survivor_.kills();
    state.medkits = inventory_.medkits();
    state.ammoPacks = inventory_.ammoPacks();
    state.night = night_;
    state.inCombat = inCombat_;
    if (inCombat_) {
        for (const auto& zombie : zombies_) {
            state.zombieKinds.push_back(zombie->kind());
            state.zombieHealth.push_back(zombie->health());
        }
    }
    return state;
}

void Game::showStatus() const {
    std::cout << survivor_ << '\n' << "Inventory: " << inventory_ << '\n';
}

void Game::showMenu() const {
    std::cout << "\n============================================\n"
                 "       ZOMBIE SURVIVAL: LAST STAND\n"
                 "============================================\n"
                 "  1. New game\n"
                 "  2. Load saved game\n"
                 "  3. Leaderboard\n"
                 "  4. Exit\n"
                 "--------------------------------------------\n";
}

void Game::showNightIntro() const {
    std::cout << "\n========== NIGHT " << night_ << " ==========\n"
              << "The barricade shakes. " << zombies_.size()
              << " infected are closing in!\n";
}

void Game::grantLoot() {
    std::uniform_int_distribution<int> loot(0, 99);
    const int roll = loot(random_);
    if (roll < 35) {
        inventory_.addMedkits(1);
        std::cout << "Scavenged loot: a medkit.\n";
    } else if (roll < 70) {
        inventory_.addAmmoPacks(1);
        std::cout << "Scavenged loot: an ammo pack.\n";
    } else {
        const int materials = 2 + night_;
        survivor_.addScrap(materials);
        inventory_.addScrap(materials);
        std::cout << "Scavenged loot: " << materials << " pieces of scrap.\n";
    }
}

void Game::finishRun(bool victory) {
    std::cout << "\n============================================\n";
    if (victory) {
        survivor_.addScore(500);
        std::cout << "                 VICTORY!\n"
                     "You held the line for three nights and reached evacuation.\n";
    } else {
        std::cout << "                 DEFEAT\n"
                  << "The horde overran the barricade. Your run is over.\n";
    }
    std::cout << "Final survivor: " << survivor_.name() << "\n"
              << "Nights survived: " << (victory ? 3 : night_ - 1) << "\n";
    showStatus();
    std::cout << "============================================\n";
    SaveManager::recordScore(survivor_, std::clamp(night_, 1, 3), kLeaderboardPath);
    inCombat_ = false;
    zombies_.clear();
    paused_ = false;
}

std::vector<std::unique_ptr<Zombie>> Game::createZombies(int count, int night) {
    std::vector<std::unique_ptr<Zombie>> result;
    std::uniform_int_distribution<int> armoredRoll(0, 99);
    for (int i = 0; i < count; ++i) {
        const bool armored = night >= 2 && armoredRoll(random_) < 25 + night * 10;
        const int health = armored ? 45 + night * 8 : 30 + night * 7;
        result.push_back(makeZombie(armored ? "Armored" : "Normal", health,
                                    night, static_cast<std::size_t>(i + 1)));
    }
    return result;
}

int Game::readChoice(const std::string& prompt, int minimum, int maximum) const {
    for (;;) {
        std::cout << prompt;
        std::string input;
        if (!std::getline(std::cin, input)) throw std::runtime_error("Input ended.");
        std::istringstream stream(input);
        int value = 0;
        char trailing = '\0';
        if ((stream >> value) && !(stream >> trailing) &&
            value >= minimum && value <= maximum) return value;
        std::cout << "Please enter a number from " << minimum << " to " << maximum << ".\n";
    }
}

std::string Game::readLine(const std::string& prompt) const {
    std::cout << prompt;
    std::string input;
    if (!std::getline(std::cin, input)) throw std::runtime_error("Input ended.");
    const auto first = input.find_first_not_of(" \t\r\n");
    const auto last = input.find_last_not_of(" \t\r\n");
    if (first == std::string::npos) return {};
    input = input.substr(first, last - first + 1);
    if (input.find_first_of("\r\n") != std::string::npos) {
        throw std::invalid_argument("Name cannot contain line breaks.");
    }
    return input;
}
