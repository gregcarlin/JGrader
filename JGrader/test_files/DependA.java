public class DependA {
  private final int test;
  private final int other;

  public DependA(int hello, int world) {
    this.test = hello;
    this.other = world;
  }

  public int result() {
    return test + other;
  }
}
